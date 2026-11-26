"""Serialized in-process device operations."""
import threading
import time
import uuid

from .device import Session, SessionError
from .frame import SeqCounter
from .link import LinkError
from .usb import list_paths, open_path


VERSION = 1
SDK_VERSION = "1.2.10"
OPERATIONS = {"hello", "search", "state", "open", "xpub", "address", "sign", "sign-message", "dispose"}


class HelperError(Exception):
    def __init__(self, code="HELPER_FAILED", *, link_failed=None):
        self.code = code
        # Unclassified SDK failures stay fatal; a surviving session route opts out.
        self.link_failed = code == "SDK_FAILED" if link_failed is None else link_failed
        if code == "WALLET_MISMATCH":
            message = (
                "Active OneKey wallet does not match this Electrum wallet (WALLET_MISMATCH). "
                "Lock your OneKey, unlock with the PIN for the saved wallet, and retry."
            )
        elif code == "PASSPHRASE_MISMATCH":
            message = (
                "The passphrase entered on your OneKey opened a different hidden wallet "
                "(PASSPHRASE_MISMATCH). Retry and enter this wallet's passphrase on the device."
            )
        else:
            message = "OneKey helper failed (" + code + "). Reconnect using the wallet wizard."
        super().__init__(message)


class Helper:
    """In-process Pro 2 / Neo session. This object does not start Node."""

    def __init__(self, ports=None):
        self.ports = ports
        self.process = None
        self.generation = None
        self._lock = threading.RLock()
        self._wallets = {}
        self._links = {}
        self._sequences = {}

    def call(self, op, params, timeout=120, generation=None, cancelled=None, on_ui=None):
        if threading.current_thread() is threading.main_thread():
            raise HelperError("GUI_THREAD")
        if op not in OPERATIONS or type(params) is not dict:
            raise HelperError("INVALID_REQUEST")
        deadline = time.monotonic() + timeout
        with self._lock:
            if cancelled is not None and cancelled.is_set():
                raise HelperError("CANCELLED")
            if time.monotonic() >= deadline:
                raise HelperError("TIMEOUT")
            if generation is not None and generation != self.generation:
                raise HelperError("STALE")
            if self.generation is None and op not in ("hello", "search"):
                raise HelperError("STALE")
            if self.generation is None:
                self.generation = uuid.uuid4().hex
            try:
                return self._dispatch(op, params, deadline, cancelled, on_ui)
            except LinkError as error:
                # The pipe failed. Drop only that interface; other devices keep
                # their generation and claimed links.
                raise HelperError(error.code, link_failed=True) from None
            except SessionError as error:
                # Acquisition/discovery failed before a usable route was returned.
                raise HelperError(error.code, link_failed=True) from None
            except HelperError:
                raise
            except Exception:
                self.generation = None
                self._wallets.clear()
                self._release_links()
                raise HelperError("SDK_FAILED", link_failed=True) from None

    def shutdown(self):
        with self._lock:
            self._wallets.clear()
            self.generation = None
            self._release_links()

    def release(self, connect_id):
        with self._lock:
            self._wallets.pop(connect_id, None)
            self._drop(connect_id)

    def close(self):
        self.shutdown()

    def _dispatch(self, op, params, deadline, cancelled, on_ui):
        if op == "hello":
            return {"protocol": 1, "sdkVersion": SDK_VERSION}
        if op == "search":
            if params:
                raise SessionError("INVALID_REQUEST")
            return self._search(deadline, cancelled, on_ui)
        if op == "dispose":
            self._wallets.clear()
            self._release_links()
            return None
        connect_id = params.get("connectId")
        if type(connect_id) is not str or not connect_id:
            raise SessionError("INVALID_REQUEST")
        # Keep a successful session claimed; an interrupted exchange is link-fatal.
        link = self._acquire(connect_id)
        try:
            session = Session(link, deadline=deadline, cancelled=cancelled, on_ui=on_ui,
                              cache=self._wallets, connect_id=connect_id)
            session.handshake(force=(op == "state"))
            if op == "state":
                return session.state()
            if op == "open":
                if params.get("mode") not in ("standard", "current", "attach", "select-hidden"):
                    raise SessionError("INVALID_REQUEST")
                return session.open(params["mode"])
            if op == "xpub":
                return session.xpub(params.get("binding"), params.get("coin"), params.get("path"), params.get("scriptType"))
            if op == "address":
                return session.address(params.get("binding"), params.get("coin"), params.get("path"),
                                       params.get("scriptType"), params.get("multisig"))
            if op == "sign":
                return session.sign(params.get("binding"), params.get("coin"), params.get("inputs"), params.get("outputs"),
                                    params.get("refTxs"), params.get("version"), params.get("locktime"))
            if op == "sign-message":
                return session.sign_message(params.get("binding"), params.get("coin"), params.get("path"),
                                            params.get("scriptType"), params.get("message"))
            raise SessionError("INVALID_REQUEST")
        except LinkError as error:
            if op == "state" and error.code == "CANCELLED":
                # A host-cancelled read-only probe interrupts the pipe, not the wallet.
                # Keep the resume entry; the next operation still re-proves the session.
                self._drop(connect_id)
            else:
                self.release(connect_id)
            raise
        except SessionError as error:
            self._wallets.pop(connect_id, None)
            link_failed = error.code == "PROTOCOL" or getattr(link, "_closed", False)
            if link_failed:
                self._drop(connect_id)
            raise HelperError(error.code, link_failed=link_failed) from None
        except BaseException:
            self._wallets.pop(connect_id, None)
            self._drop(connect_id)
            raise

    def _search(self, deadline, cancelled, on_ui):
        paths = list(self.ports) if self.ports is not None else list_paths()
        found = []
        first_usb_error = None
        for path in paths:
            if cancelled is not None and cancelled.is_set():
                raise LinkError("CANCELLED")
            if time.monotonic() >= deadline:
                raise LinkError("TIMEOUT")
            held = self.ports is not None or path in self._links
            link = None
            try:
                link = self._links[path] if path in self._links else self._borrow(path)
                probe_deadline = deadline if held else min(deadline, time.monotonic() + 1)
                session = Session(link, deadline=probe_deadline, cancelled=cancelled, on_ui=on_ui,
                                  cache=self._wallets, connect_id=path)
                session.handshake(force=True)
                try:
                    state = session.state()
                except SessionError as error:
                    if error.code == "UNSUPPORTED":
                        continue
                    raise
                found.append({"connectId": path, "deviceId": state["deviceId"],
                              "serialNo": state["serialNo"], "model": state["model"]})
            except LinkError as error:
                if held:
                    self.release(path)
                if error.code == "CANCELLED" or (cancelled is not None and cancelled.is_set()):
                    raise LinkError("CANCELLED") from None
                if time.monotonic() >= deadline:
                    raise LinkError("TIMEOUT") from None
                # A held device's failed probe must not hide other devices.
                # Unclaimed candidates that are busy, unsupported, or reject V2 are skipped
                # when another device succeeds; if none succeed, surface the USB error.
                if not held and error.code in ("USB_UNAVAILABLE", "SDK_FAILED"):
                    if first_usb_error is None:
                        first_usb_error = error
                    continue
                if not held and error.code not in ("TIMEOUT", "PROTOCOL"):
                    raise
            except SessionError as error:
                if held:
                    self.release(path)
                if error.code in ("CANCELLED", "FIRMWARE_CANCELLED") or (cancelled is not None and cancelled.is_set()):
                    raise LinkError("CANCELLED") from None
                if time.monotonic() >= deadline:
                    raise LinkError("TIMEOUT") from None
                if not held and error.code not in ("UNSUPPORTED", "PROTOCOL"):
                    raise
            except BaseException:
                if held:
                    self._drop(path)
                raise
            finally:
                if link is not None and not held:
                    try:
                        link.close()
                    except Exception:
                        pass
        if cancelled is not None and cancelled.is_set():
            raise LinkError("CANCELLED")
        if time.monotonic() >= deadline:
            raise LinkError("TIMEOUT")
        if not found and first_usb_error is not None:
            raise first_usb_error
        return found

    def _acquire(self, connect_id):
        if self.ports is not None:
            return self._borrow(connect_id)
        link = self._links.get(connect_id)
        if link is not None:
            return link
        link = self._borrow(connect_id)
        self._links[connect_id] = link
        return link

    def _borrow(self, connect_id):
        if self.ports is not None:
            link = self.ports.get(connect_id)
            if link is None:
                raise SessionError("SDK_FAILED")
            return link
        link = open_path(connect_id)
        # The wire counter belongs to the physical path, not to a USB claim.
        link._seq = self._sequences.setdefault(connect_id, SeqCounter())
        return link

    def _drop(self, connect_id):
        link = self._links.pop(connect_id, None)
        if link is None:
            return
        try:
            link.close()
        except Exception:
            pass

    def _release_links(self):
        for connect_id in list(self._links):
            self._drop(connect_id)
