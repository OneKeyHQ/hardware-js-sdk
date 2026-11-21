"""Bounded, generation-scoped stdio client. Never log child streams or payloads."""
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import threading
import time
import uuid

from .device import Session, SessionError
from .link import LinkError
from .usb import list_paths, open_path


VERSION = 1
MAX_LINE = 1024 * 1024
SDK_SOURCE = "38f0b8c5d8fb645c1652880eb099866de57280aa"
SDK_VERSION = "1.2.10"
OPERATIONS = {"hello", "search", "state", "open", "xpub", "address", "sign", "cancel", "ui", "dispose"}
# Same targets as helper/pin.cjs BUNDLE_PLATFORMS. Linux nodes are the glibc builds.
DESKTOP_PLATFORMS = ("darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "win32-arm64", "win32-x64")


def _invalid_constant(_):
    raise ValueError()


class HelperError(Exception):
    def __init__(self, code="HELPER_FAILED"):
        self.code = code
        super().__init__("OneKey helper failed (" + code + "). Reconnect using the wallet wizard.")


def desktop_platform():
    arch = {"arm64": "arm64", "aarch64": "arm64", "x86_64": "x64", "amd64": "x64"}.get(platform.machine().lower())
    name = f"{sys.platform}-{arch}" if arch else ""
    return name if name in DESKTOP_PLATFORMS else None


def runtime_candidates():
    # Electrum serves a zip plugin from memory. __file__ is "<plugin.zip>/onekey/ipc.py"
    # and is not a real path. The runtime is the sibling directory of that zip.
    raw = __file__.replace("\\", "/")
    if ".zip/" in raw:
        archive = raw.split(".zip/", 1)[0] + ".zip"
        yield Path(archive).parent / "onekey-runtime" / "runtime.json"
        return
    plugin_root = Path(__file__).resolve().parents[1]
    yield plugin_root / "dist" / "onekey-runtime" / "runtime.json"


def _inside(root, relative):
    if type(relative) is not str or relative.startswith(("/", "\\")) or ".." in Path(relative).parts:
        raise ValueError()
    candidate = (root / relative).resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError()
    if not candidate.is_file():
        raise ValueError()
    return candidate


def _authorized_runtime_pin():
    """Sha256 of runtime.json pinned inside the zip Electrum already authorized.

    Dev and tests are not loaded from a zip, so they skip this. A zip with no
    pin, or a sibling runtime whose receipt does not match that pin, is refused.
    The pin is read from the in-memory archive, not from the zip path on disk.
    """
    raw = __file__
    marker = ".zip/"
    if marker not in raw.replace("\\", "/"):
        return None
    get_data = getattr(__loader__, "get_data", None)
    if not callable(get_data):
        raise HelperError("RUNTIME_INVALID")
    # Electrum joins the archive path as-is, then adds "/". Windows archive
    # paths keep backslashes, and get_data matches that original string.
    if marker not in raw:
        raise HelperError("RUNTIME_INVALID")
    try:
        payload = get_data(raw.split(marker, 1)[0] + ".zip/onekey/runtime_pin.txt")
    except (OSError, KeyError, ValueError, TypeError):
        raise HelperError("RUNTIME_INVALID") from None
    if type(payload) is not bytes:
        raise HelperError("RUNTIME_INVALID")
    try:
        text = payload.decode("ascii").strip()
    except UnicodeError:
        raise HelperError("RUNTIME_INVALID") from None
    if len(text) != 64 or any(character not in "0123456789abcdef" for character in text):
        raise HelperError("RUNTIME_INVALID")
    return text


def runtime_command():
    pinned = _authorized_runtime_pin()
    selected = os.environ.get("ONEKEY_ELECTRUM_RUNTIME", "")
    if selected:
        manifest = Path(selected)
        if not manifest.is_absolute():
            raise HelperError("RUNTIME_MISSING")
    else:
        manifest = next((path for path in runtime_candidates() if path.is_file()), None)
        if manifest is None:
            raise HelperError("RUNTIME_MISSING")
    try:
        manifest = manifest.resolve()
        receipt = manifest.read_bytes()
        receipt_hash = hashlib.sha256(receipt).hexdigest()
        if pinned is not None and receipt_hash != pinned:
            raise ValueError()
        if manifest.with_suffix(".sha256").read_text().strip() != receipt_hash:
            raise ValueError()
        data = json.loads(receipt)
        if data.get("sdkSource") != SDK_SOURCE or data.get("sdkVersion") != SDK_VERSION:
            raise ValueError()
        root = manifest.parent
        for name in ("entry.cjs", "runtime.cjs", "pin.cjs"):
            if hashlib.sha256((root / name).read_bytes()).hexdigest() != data["assets"][name]:
                raise ValueError()
        if data.get("mode") == "bundle":
            if data.get("schema") != 2 or tuple(sorted(data["platforms"])) != DESKTOP_PLATFORMS:
                raise ValueError()
            target = desktop_platform()
            spec = data["platforms"][target] if target else None
            if type(spec) is not dict:
                raise ValueError()
            node = _inside(root, spec["node"])
            if hashlib.sha256(node.read_bytes()).hexdigest() != spec["nodeSha256"]:
                raise ValueError()
            if sys.platform != "win32" and node.stat().st_mode & 0o111 != 0o111:
                node.chmod(node.stat().st_mode | 0o755)
        else:
            if data.get("schema") != VERSION:
                raise ValueError()
            node = Path(data["node"])
            if not node.is_absolute() or not node.is_file():
                raise ValueError()
        return [str(node), str(root / "entry.cjs"), "--manifest", str(manifest),
                "--manifest-sha256", receipt_hash]
    except HelperError:
        raise
    except (OSError, ValueError, KeyError, TypeError):
        raise HelperError("RUNTIME_INVALID") from None


class Helper:
    """In-process Pro 2 / Neo session. This object does not start Node."""

    def __init__(self, ports=None):
        self.ports = ports
        self.process = None
        self.generation = None
        self._lock = threading.RLock()
        self._wallets = {}
        self._links = {}

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
            except (SessionError, LinkError) as error:
                self.generation = None
                self._wallets.clear()
                raise HelperError(error.code) from None
            except HelperError:
                self.generation = None
                raise
            except Exception:
                self.generation = None
                self._wallets.clear()
                raise HelperError("SDK_FAILED") from None

    def shutdown(self):
        with self._lock:
            self._wallets.clear()
            self.generation = None
            self._release_links()

    def close(self):
        self.shutdown()

    def _dispatch(self, op, params, deadline, cancelled, on_ui):
        if op == "hello":
            return {"protocol": 1, "sdkVersion": SDK_VERSION}
        if op == "search":
            if params:
                raise SessionError("INVALID_REQUEST")
            return self._search(deadline, cancelled, on_ui)
        if op in ("cancel", "ui", "dispose"):
            if op == "dispose":
                self._wallets.clear()
                self._release_links()
            return None
        connect_id = params.get("connectId")
        if type(connect_id) is not str or not connect_id:
            raise SessionError("INVALID_REQUEST")
        # The wallet session lives with the claimed interface. Releasing USB
        # between calls would depend on firmware keeping that session.
        link = self._acquire(connect_id)
        try:
            session = Session(link, deadline=deadline, cancelled=cancelled, on_ui=on_ui,
                              cache=self._wallets, connect_id=connect_id)
            session.handshake()
            if op == "state":
                return session.state()
            if op == "open":
                if params.get("mode") not in ("standard", "select-hidden", "select-attach-pin"):
                    raise SessionError("INVALID_REQUEST")
                return session.open(params["mode"])
            if op == "xpub":
                return session.xpub(params.get("binding"), params.get("coin"), params.get("path"), params.get("scriptType"))
            if op == "address":
                return session.address(params.get("binding"), params.get("coin"), params.get("path"), params.get("scriptType"))
            if op == "sign":
                return session.sign(params.get("binding"), params.get("coin"), params.get("inputs"), params.get("outputs"),
                                    params.get("refTxs"), params.get("version"), params.get("locktime"))
            raise SessionError("INVALID_REQUEST")
        except BaseException:
            self._drop(connect_id)
            raise

    def _search(self, deadline, cancelled, on_ui):
        paths = list(self.ports) if self.ports is not None else list_paths()
        found = []
        for path in paths:
            held = self.ports is None and path in self._links
            link = None
            try:
                link = self._links[path] if held else self._borrow(path)
                session = Session(link, deadline=deadline, cancelled=cancelled, on_ui=on_ui,
                                  cache=self._wallets, connect_id=path)
                session.handshake()
                try:
                    state = session.state()
                except SessionError as error:
                    if error.code == "UNSUPPORTED":
                        continue
                    raise
                found.append({"connectId": path, "deviceId": state["deviceId"],
                              "serialNo": state["serialNo"], "model": state["model"]})
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
        return found

    def _acquire(self, connect_id):
        if self.ports is not None:
            return self._borrow(connect_id)
        link = self._links.get(connect_id)
        if link is not None:
            return link
        link = open_path(connect_id)
        self._links[connect_id] = link
        return link

    def _borrow(self, connect_id):
        if self.ports is not None:
            link = self.ports.get(connect_id)
            if link is None:
                raise SessionError("SDK_FAILED")
            return link
        return open_path(connect_id)

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

