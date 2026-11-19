"""Bounded, generation-scoped stdio client. Never log child streams or payloads."""
import hashlib
import json
import os
from pathlib import Path
import platform
import queue
import subprocess
import sys
import threading
import time
import uuid


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


def runtime_command():
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
    def __init__(self, command=None):
        self.command = command
        self.process = None
        self.generation = None
        self._serial = threading.RLock()
        self._outgoing = None
        self._threads = []
        self._counter = 0
        self._messages = None

    def _start(self, deadline, cancelled):
        self.generation = uuid.uuid4().hex
        # Inherited Node hooks could write secrets or inject code before entry.cjs starts.
        env = {key: value for key, value in os.environ.items()
               if key not in ("NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "ELECTRON_RUN_AS_NODE")}
        self._messages = queue.Queue(maxsize=32)
        try:
            self.process = subprocess.Popen(
                (self.command or runtime_command()) + ["--generation", self.generation],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                env=env,
            )
        except (OSError, HelperError):
            self.generation = None
            raise HelperError("RUNTIME_UNAVAILABLE") from None
        self._outgoing = queue.Queue(maxsize=16)
        self._threads = [threading.Thread(target=self._read, args=(self.process, self._messages), daemon=True),
                         threading.Thread(target=self._writer, args=(self.process, self._outgoing, self._messages), daemon=True)]
        for thread in self._threads:
            thread.start()
        try:
            if self.call("hello", {}, timeout=min(30, deadline - time.monotonic()),
                         cancelled=cancelled) != {"protocol": 1, "sdkVersion": SDK_VERSION}:
                raise HelperError("PROTOCOL")
        except BaseException:
            self.close()
            raise

    @staticmethod
    def _read(process, messages):
        try:
            while True:
                raw = process.stdout.readline(MAX_LINE + 1)
                if not raw or len(raw) > MAX_LINE or not raw.endswith(b"\n"):
                    raise ValueError()
                message = json.loads(raw, parse_constant=_invalid_constant)
                if type(message) is not dict:
                    raise ValueError()
                messages.put_nowait(message)
        except (OSError, ValueError, RecursionError, queue.Full):
            # Waking a waiter must not depend on a malformed/noisy child draining its pipe.
            try:
                if process.poll() is None:
                    process.kill()
            except OSError:
                pass
            try:
                messages.put_nowait(None)
            except queue.Full:
                pass

    @staticmethod
    def _writer(process, outgoing, messages):
        try:
            while True:
                item = outgoing.get()
                if item is None:
                    return
                raw, deadline, cancelled = item
                if ((cancelled is not None and cancelled.is_set())
                        or (deadline is not None and time.monotonic() >= deadline)):
                    continue
                process.stdin.write(raw)
                process.stdin.flush()
        except (OSError, ValueError):
            try:
                messages.put_nowait(None)
            except queue.Full:
                pass

    def _send(self, operation, params, request_id, *, deadline=None, cancelled=None):
        if operation not in OPERATIONS:
            raise HelperError("PROTOCOL")
        raw = json.dumps(dict(v=VERSION, generation=self.generation, id=request_id,
                              op=operation, params=params), separators=(",", ":"),
                         allow_nan=False).encode() + b"\n"
        if len(raw) > MAX_LINE:
            raise HelperError("LIMIT")
        try:
            self._outgoing.put_nowait((raw, deadline, cancelled))
        except queue.Full:
            raise HelperError("IO") from None

    def call(self, operation, params, *, timeout=120, cancelled=None, on_ui=None,
             generation=None):
        if threading.current_thread() is threading.main_thread():
            raise HelperError("GUI_THREAD")
        deadline = time.monotonic() + timeout
        expected_generation = generation or self.generation

        def check_wait():
            if cancelled is not None and cancelled.is_set():
                raise HelperError("CANCELLED")
            if time.monotonic() >= deadline:
                raise HelperError("TIMEOUT")

        check_wait()
        while not self._serial.acquire(timeout=min(0.05, max(0, deadline - time.monotonic()))):
            check_wait()
        try:
            # A queued failure belongs to this caller, not to the request owning the link.
            check_wait()
            if self.process is None:
                if operation != "search" or generation is not None:
                    raise HelperError("STALE")
                self._start(deadline, cancelled)
                expected_generation = self.generation
            if expected_generation != self.generation:
                raise HelperError("STALE")
            check_wait()
            self._counter += 1
            request_id = self._counter
            try:
                self._send(operation, params, request_id, deadline=deadline, cancelled=cancelled)
                while True:
                    if cancelled is not None and cancelled.is_set():
                        # Control traffic bypasses the helper's device queue. Kill even if cancel hangs.
                        self._counter += 1
                        cancel_id = self._counter
                        self._send("cancel", {"target": request_id}, cancel_id)
                        cancel_deadline = time.monotonic() + 0.25
                        while time.monotonic() < cancel_deadline:
                            try:
                                ack = self._messages.get(timeout=0.05)
                            except queue.Empty:
                                continue
                            if ack is None or ack == dict(v=VERSION, generation=self.generation,
                                                          id=cancel_id, ok=True, result=None):
                                break
                        raise HelperError("CANCELLED")
                    if time.monotonic() >= deadline:
                        raise HelperError("TIMEOUT")
                    try:
                        message = self._messages.get(timeout=min(0.05, max(0.001, deadline - time.monotonic())))
                    except queue.Empty:
                        if self.process.poll() is not None:
                            raise HelperError("CRASH")
                        continue
                    # The frame may have been queued before cancel or the deadline. Do not deliver it.
                    if cancelled is not None and cancelled.is_set():
                        raise HelperError("CANCELLED")
                    if time.monotonic() >= deadline:
                        raise HelperError("TIMEOUT")
                    if (message is None or type(message.get("v")) is not int
                            or type(message.get("id")) is not int or message.get("v") != VERSION
                            or message.get("generation") != self.generation
                            or message.get("id") != request_id):
                        raise HelperError("PROTOCOL")
                    if "event" in message:
                        if set(message) != {"v", "generation", "id", "event", "token"}:
                            raise HelperError("PROTOCOL")
                        if message["event"] not in ("pin", "passphrase", "button", "passphrase-select", "close"):
                            raise HelperError("PROTOCOL")
                        if type(message["token"]) is not int or message["token"] < 1:
                            raise HelperError("PROTOCOL")
                        if on_ui:
                            on_ui(message["event"])
                        if message["event"] == "passphrase-select":
                            self._counter += 1
                            self._send("ui", {"target": request_id, "token": message["token"],
                                              "choice": "device"}, self._counter,
                                       deadline=deadline, cancelled=cancelled)
                        continue
                    if set(message) != {"v", "generation", "id", "ok", "result"} or message["ok"] is not True:
                        if (set(message) == {"v", "generation", "id", "ok", "error"}
                                and message["ok"] is False and type(message["error"]) is dict
                                and set(message["error"]) == {"code"}
                                and type(message["error"]["code"]) is str
                                and message["error"]["code"] in {"CANCELLED", "INVALID_REQUEST", "SDK_FAILED", "WALLET_MISMATCH",
                                                                   "DEVICE_MISMATCH", "UNSUPPORTED", "BUSY", "UI_FAILED"}):
                            raise HelperError(message["error"]["code"])
                        raise HelperError("PROTOCOL")
                    return message["result"]
            except (OSError, ValueError, TypeError, RecursionError, HelperError) as error:
                self.close()
                if isinstance(error, HelperError):
                    raise
                raise HelperError("IO") from None
        finally:
            self._serial.release()

    def shutdown(self):
        try:
            if self.process is not None:
                self.call("dispose", {}, timeout=2, generation=self.generation)
        except HelperError:
            pass
        finally:
            self.close()

    def close(self):
        process, self.process = self.process, None
        self.generation = None
        if process is not None:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            try:
                self._outgoing.put_nowait(None)
            except queue.Full:
                pass
            for thread in self._threads:
                thread.join(timeout=1)
            process.stdin.close()
            process.stdout.close()
