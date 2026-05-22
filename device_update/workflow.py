"""
Workflow runner for OneKey Pro 2 update flow (per workflow.md).

Usage:
    python workflow_step1.py all       # step1 -> step2 -> step3 -> step4
    python workflow_step1.py step1     # only step1
    python workflow_step1.py step2     # only step2
    python workflow_step1.py step3     # only step3
    python workflow_step1.py step4     # only step4

Standalone prelude (step2/step3 only, NOT when run via "all"):
  Per workflow.md "要求": before the step body, do
    connect (60s) -> reboot type=1 -> wait 1s -> reconnect (60s)
  The reconnected handle is then handed into the step body so it can skip
  its own initial connect.
  step4 already embeds this sequence in its own body (4.1-4.3), so it does
  not get an extra standalone prelude.

step1 - update romloader
  1) connect device                       (timeout 60s)
  2) ping device                          (timeout 60s)
  3) check vol0:assets/boot/boot_logo.bin; delete it if it exists
  4) file_write bin/pro2_romloader_v3_msc.bin       -> vol0:romloader.bin   (chunk 1024)
  5) file_write bin/pro2_boot_update_rom_signed.bin -> vol0:update_rom.bin  (chunk 1024)
  6) firmware_update type=1  path=vol0:update_rom.bin
  7) reboot type=0, then wait 20s
  8) connect device                       (timeout 60s)
  9) reboot type=0, then wait 40s, then enter step2
  -> any failure in 3-9 retries from (1)

step2 - update resources
  1) connect device                       (timeout 60s)
  2) sendDiskControl enable=1 (enable MSC), reply ignored, then wait 3s
  3) wait for OneKey OS volume to appear on the host (timeout 30s), then wait 3s
  4) copy ./assets to the OneKey OS MSC volume via copy_assets.py
       (pass the discovered mount as --dest, then wipe + mirror)
       wait 3 seconds after copy completes; on failure the workflow EXITS (no retry)
  5) connect device                       (timeout 60s)
  6) sendDiskControl enable=0 (disable MSC), reply ignored, then wait 3s, then enter step3

step3 - update bluetooth
  1) if device already connected, skip; else connect (timeout 60s)
  2) ping device                          (timeout 60s), then wait 5s
  3) check vol0:bluetooth.bin; if missing, file_write bin/pro2_bluetooth_signed.bin
  4) firmware_update type=2 path=vol0:bluetooth.bin
       (do not check result, wait for FirmwareInstallProgress=100%)
  5) wait 5s, then enter step4

step4 - update firmware
  1) connect device                       (timeout 60s)
  2) reboot type=1, then wait 1s; on failure retry from (1)
  3) connect device again                 (timeout 60s)
  4) ping device                          (timeout 60s), then wait 5s
  5) check vol0:core.bin; if missing, file_write bin/pro2_firmware_signed.bin -> vol0:core.bin
       (failure here EXITS the workflow)
  6) firmware_update type=1 path=vol0:core.bin
       (do not check result, wait for FirmwareInstallProgress=100%)
  7) wait 10s, then connect device        (timeout 30s)
"""

import argparse
import importlib
import os
import re
import subprocess
import sys
import time
from typing import Optional


# ==================== requirements bootstrap ====================
# Must run BEFORE we import third-party modules from onekey_webusb.

_REQUIREMENTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "requirements.txt")

# Map distribution name (left of '>=' / '==' in requirements.txt) to the importable
# module name. Keep this small and explicit; if it's missing here we fall back to
# using the distribution name as the module name.
_PKG_TO_MODULE = {
    "pyusb":          "usb",
    "libusb-package": "libusb_package",
    "libusb_package": "libusb_package",
}


def _parse_requirements(path: str):
    """Yield (pkg_name, raw_spec) for each non-comment, non-blank line."""
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            # split on the first version operator we find
            m = re.match(r"^\s*([A-Za-z0-9_.\-]+)\s*(.*)$", line)
            if not m:
                continue
            yield m.group(1), line


def _ensure_requirements() -> None:
    """Verify every dep in requirements.txt is importable; install if not."""
    missing = []
    for pkg, spec in _parse_requirements(_REQUIREMENTS_FILE):
        module_name = _PKG_TO_MODULE.get(pkg.lower(), pkg.replace("-", "_"))
        try:
            importlib.import_module(module_name)
        except ImportError:
            missing.append((pkg, spec, module_name))

    if not missing:
        return

    print(f"[bootstrap] missing packages: {[m[0] for m in missing]}")
    print(f"[bootstrap] installing from {_REQUIREMENTS_FILE} ...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", _REQUIREMENTS_FILE]
        )
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"[bootstrap] pip install failed (exit {e.returncode}). "
                         f"Run manually:  {sys.executable} -m pip install -r {_REQUIREMENTS_FILE}\n")
        sys.exit(2)

    # Re-verify; importlib caches negative results so flush them.
    importlib.invalidate_caches()
    # If pip fell back to --user (common when system Python isn't writable),
    # the user-site dir may not be on sys.path of THIS process yet.
    try:
        import site
        user_site = site.getusersitepackages()
        if user_site and user_site not in sys.path:
            sys.path.insert(0, user_site)
    except Exception:
        pass

    still_missing = []
    for pkg, _spec, module_name in missing:
        try:
            importlib.import_module(module_name)
        except ImportError:
            still_missing.append(pkg)
    if still_missing:
        sys.stderr.write(
            f"[bootstrap] still missing after install: {still_missing}. "
            f"Re-run the script, or install manually:\n"
            f"  {sys.executable} -m pip install -r {_REQUIREMENTS_FILE}\n"
        )
        sys.exit(2)
    print("[bootstrap] all dependencies installed; continuing.")


_ensure_requirements()


from onekey_webusb import (
    PB_MSG_TYPE,
    PB_MSG_NAME,
    FW_TARGET_NAME,
    DISK_CTRL_NAME,
    WebUsbDevice,
    encode_ping,
    encode_file,
    encode_file_write,
    encode_firmware_update,
    encode_reboot,
    encode_path_info_query,
    encode_file_delete,
    encode_disk_control,
    decode_path_info,
    decode_success,
    decode_failure,
    decode_file,
    decode_firmware_install_progress,
    format_bytes,
)


# ==================== paths & constants ====================

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_BIN_DIR  = os.path.join(_BASE_DIR, "bin")
ROMLOADER_BIN  = os.path.join(_BIN_DIR, "pro2_romloader_v3_msc.bin")
UPDATE_ROM_BIN = os.path.join(_BIN_DIR, "pro2_boot_update_rom_signed.bin")
BLUETOOTH_BIN  = os.path.join(_BIN_DIR, "pro2_bluetooth_signed.bin")
FIRMWARE_BIN   = os.path.join(_BIN_DIR, "pro2_firmware_signed.bin")
ASSETS_DIR     = os.path.join(_BASE_DIR, "assets")

CONNECT_TIMEOUT_S = 60
PING_TIMEOUT_S = 60
CHUNK_STEP1 = 1024  # file_write chunk used for step1 (romloader / update_rom)
CHUNK_STEP3 = 1024  # file_write chunk used for step3 (bluetooth)
ONEKEY_VOLUME_LABEL = "OneKey OS"
COPY_ASSETS_SCRIPT  = os.path.join(_BASE_DIR, "copy_assets.py")
COPY_ASSETS_TIMEOUT_S = 600
COPY_ASSETS_WORKERS = 8
STEP2_VOLUME_WAIT_S = 30  # timeout for OneKey OS volume to appear on host (step2)
STEP2_POST_VOLUME_WAIT_S = 3  # delay after volume appears, before copy_assets (step2)
STEP2_POST_COPY_WAIT_S = 3  # delay after copy_assets completes, before next sub-step
STEP2_POST_MSC_ENABLE_WAIT_S = 3  # delay after sendDiskControl(enable=1), before scanning volume
STEP2_POST_MSC_DISABLE_WAIT_S = 3  # delay after sendDiskControl(enable=0), before step3
STEP3_POST_PING_WAIT_S = 5  # delay after ping succeeds in step3, before next step
STEP3_POST_COMPLETE_WAIT_S = 5  # delay at end of step3, before step4
STEP4_POST_PING_WAIT_S = 5  # delay after ping succeeds in step4, before next step
STEP4_POST_REBOOT_WAIT_S = 1  # delay after reboot type=1 in step4, before reconnect
STEP1_POST_REBOOT_S = 20
STEP1_POST_REBOOT2_S = 40   # second reboot wait at end of step1, before step2
STEP1_BOOT_LOGO_PATH = "vol0:assets/boot/boot_logo.bin"  # checked-and-deleted at start of step1
STEP4_PRE_CONNECT_S = 10  # delay after firmware_update, before final connect (step4)
STEP4_FINAL_CONNECT_TIMEOUT_S = 30

# When step2/3/4 is invoked STANDALONE (not via run_all), workflow.md requires:
#   connect -> reboot type=1 -> wait 1s -> reconnect (60s)
# before the step's own body runs.
STANDALONE_POST_REBOOT_WAIT_S = 1

# How long to keep waiting for "progress reaches 100%" after firmware_update is dispatched.
PROGRESS_WAIT_S = 600
# Idle timeout: if no progress frame arrives for this long, give up.
PROGRESS_IDLE_S = 90

DEFAULT_MAX_ATTEMPTS = 1

# Files in the assets tree we should NOT upload to the device.
_IGNORED_BASENAMES = {".DS_Store", "Thumbs.db"}


class WorkflowFatal(Exception):
    """Raised when a step encounters an unrecoverable error and the whole
    workflow should exit immediately (no retry, no further steps)."""


# ==================== logging helpers ====================

def _ts() -> str:
    return time.strftime("%H:%M:%S")


def log(level: str, msg: str) -> None:
    sys.stdout.write(f"[{_ts()}] [{level}] {msg}\n")
    sys.stdout.flush()


def stage(title: str) -> None:
    bar = "=" * 70
    sys.stdout.write(f"\n{bar}\n[{_ts()}] >>> {title}\n{bar}\n")
    sys.stdout.flush()


def substep(step_no: str, title: str) -> None:
    """Print a small sub-step banner. Leaves a blank line before it so sub-steps
    are visually separated from the previous one."""
    sys.stdout.write(f"\n[{_ts()}] --- {step_no} {title} ---\n")
    sys.stdout.flush()


# ==================== device primitives ====================

def wait_connect(timeout_s: int = CONNECT_TIMEOUT_S, label: str = "connect") -> WebUsbDevice:
    log("INFO", f"[{label}] Connecting (timeout {timeout_s}s)...")
    deadline = time.monotonic() + timeout_s
    attempt = 0
    last_err: Optional[str] = None
    while time.monotonic() < deadline:
        attempt += 1
        dev = WebUsbDevice()
        try:
            dev.open()
            log("OK", f"[{label}] Connected on attempt {attempt}")
            return dev
        except Exception as e:
            last_err = str(e)
            try:
                dev.close()
            except Exception:
                pass
            remaining = deadline - time.monotonic()
            log("WARN", f"[{label}] Attempt {attempt} failed: {last_err} | retry, {remaining:.1f}s left")
            time.sleep(1.0)
    raise TimeoutError(f"[{label}] Connect timeout after {timeout_s}s, last error: {last_err}")


def safe_close(dev: Optional[WebUsbDevice]) -> None:
    if dev is None:
        return
    try:
        dev.close()
    except Exception:
        pass


def do_ping(dev: WebUsbDevice, timeout_s: int = PING_TIMEOUT_S, tag: str = "") -> bool:
    label = f"ping{('-' + tag) if tag else ''}"
    log("INFO", f"[{label}] (timeout {timeout_s}s)...")
    deadline = time.monotonic() + timeout_s
    attempt = 0
    while time.monotonic() < deadline:
        attempt += 1
        try:
            pb_payload = encode_ping("workflow")
            msg_type, payload = dev.send_and_recv(
                PB_MSG_TYPE["Ping"], pb_payload, timeout_ms=3000
            )
            if msg_type == PB_MSG_TYPE["Success"]:
                decoded = decode_success(payload)
                log("OK", f"[{label}] success on attempt {attempt}: \"{decoded['message']}\"")
                return True
            if msg_type == PB_MSG_TYPE["Failure"]:
                decoded = decode_failure(payload)
                log("WARN", f"[{label}] failure attempt {attempt}: code={decoded['code']} msg=\"{decoded['message']}\"")
            else:
                log("WARN", f"[{label}] unexpected msg_type={msg_type} ({PB_MSG_NAME.get(msg_type,'?')})")
        except Exception as e:
            log("WARN", f"[{label}] attempt {attempt} error: {e}")
        time.sleep(0.5)
    log("FAIL", f"[{label}] timeout after {timeout_s}s")
    return False


def do_file_write(dev: WebUsbDevice, src_path: str, dst_path: str,
                  chunk_size: int, show_progress: bool = True,
                  print_prefix: str = "          ") -> bool:
    log("INFO", f"FileWrite: {src_path} -> {dst_path}  (chunk={chunk_size})")
    if not os.path.isfile(src_path):
        log("FAIL", f"Source file not found: {src_path}")
        return False

    with open(src_path, "rb") as f:
        data = f.read()
    total_len = len(data)
    if show_progress:
        log("INFO", f"File size: {total_len} ({format_bytes(total_len)})")

    offset = 0
    is_first = True
    start = time.monotonic()
    last_print = start
    chunk_idx = 0

    try:
        while offset < total_len:
            this_chunk = min(chunk_size, total_len - offset)
            chunk_data = data[offset:offset + this_chunk]
            file_bytes = encode_file(dst_path, offset, total_len, chunk_data)
            pb_payload = encode_file_write(file_bytes, overwrite=is_first, append=False)
            is_first = False
            chunk_idx += 1

            msg_type, payload = dev.send_and_recv(
                PB_MSG_TYPE["FileWrite"], pb_payload, timeout_ms=10000
            )

            if msg_type == PB_MSG_TYPE["Failure"]:
                decoded = decode_failure(payload)
                log("FAIL", f"FileWrite failure @offset={offset} chunk#{chunk_idx}: code={decoded['code']} msg=\"{decoded['message']}\"")
                return False
            if msg_type != PB_MSG_TYPE["File"]:
                log("FAIL", f"FileWrite unexpected msg_type={msg_type} ({PB_MSG_NAME.get(msg_type,'?')})")
                return False

            decoded = decode_file(payload)
            processed = decoded["processed_byte"] if decoded["processed_byte"] is not None else (offset + this_chunk)
            offset = processed

            if show_progress:
                now = time.monotonic()
                if now - last_print >= 0.3 or offset >= total_len:
                    elapsed = now - start
                    speed = offset / elapsed if elapsed > 0 else 0
                    pct = offset * 100.0 / total_len if total_len else 100.0
                    sys.stdout.write(
                        f"\r{print_prefix}progress: {pct:6.2f}%  {format_bytes(offset)} / {format_bytes(total_len)}  "
                        f"{format_bytes(int(speed))}/s   "
                    )
                    sys.stdout.flush()
                    last_print = now

        if show_progress:
            sys.stdout.write("\n")
        elapsed = time.monotonic() - start
        avg = total_len / elapsed if elapsed > 0 else 0
        log("OK", f"FileWrite done: {dst_path}  {format_bytes(total_len)} in {elapsed:.2f}s ({format_bytes(int(avg))}/s)")
        return True

    except Exception as e:
        if show_progress:
            sys.stdout.write("\n")
        log("FAIL", f"FileWrite exception: {e}")
        return False


def do_firmware_update_either(dev: WebUsbDevice, target_id: int, path: str,
                              timeout_s: int = 120) -> bool:
    """Send FirmwareUpdate and accept EITHER a Success reply OR FirmwareInstallProgress=100%.

    Both conditions count as success (OR semantics). The first one to occur wins.
    Failure reply is treated as failure. Used by step1.6.
    """
    target_label = FW_TARGET_NAME.get(target_id, str(target_id))
    log("INFO", f"FirmwareUpdate target={target_id} ({target_label}) path={path}")
    log("INFO", "  success criterion: FirmwareUpdate reply=Success  OR  FirmwareInstallProgress=100%")
    state = {
        "done_ok": False,        # set when either success path fires
        "done_reason": "",
        "fail_msg": "",          # set when a Failure reply arrives
        "last_progress": -1,
    }

    def _on_any(mt: int, payload: bytes) -> None:
        if state["done_ok"]:
            return
        if mt == PB_MSG_TYPE["FirmwareInstallProgress"]:
            p = decode_firmware_install_progress(payload)
            if p["progress"] != state["last_progress"]:
                stage_str = f" [{p['stage']}]" if p["stage"] else ""
                tag = FW_TARGET_NAME.get(p["target_id"], p["target_id"])
                log("PROG", f"FirmwareInstallProgress  {tag}: {p['progress']}%{stage_str}")
                state["last_progress"] = p["progress"]
            if p["progress"] >= 100:
                state["done_ok"] = True
                state["done_reason"] = "FirmwareInstallProgress reached 100%"
        elif mt == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            state["done_ok"] = True
            state["done_reason"] = f"FirmwareUpdate reply = Success (\"{decoded['message']}\")"
        elif mt == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            state["fail_msg"] = f"code={decoded['code']} msg=\"{decoded['message']}\""
        else:
            log("INFO", f"  (ignored) unsolicited msg_type={mt} ({PB_MSG_NAME.get(mt,'?')})")

    dev.on_unsolicited = _on_any
    try:
        # Dispatch FirmwareUpdate by sending the frame directly — we route everything
        # (reply + progress) through the same callback so either side can win the race.
        from onekey_webusb import build_pb_frame
        pb_payload = encode_firmware_update(
            [{"target_id": target_id, "path": path}],
            reboot_on_success=False,
        )
        frame = build_pb_frame(dev.framer, PB_MSG_TYPE["FirmwareUpdate"], pb_payload)
        dev.dev.write(dev.ep_out.bEndpointAddress, frame, timeout=5000)
        log("INFO", "  FirmwareUpdate request dispatched; waiting for reply=Success or progress=100%...")

        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            try:
                dev.drain_unsolicited(500)
            except Exception:
                if state["done_ok"]:
                    pass  # device tearing down after success
                else:
                    raise
            if state["done_ok"]:
                log("OK", f"{target_label} update step SUCCESS  ({state['done_reason']})")
                return True
            if state["fail_msg"]:
                log("FAIL", f"FirmwareUpdate failure: {state['fail_msg']}")
                return False
        log("FAIL", f"FirmwareUpdate timed out after {timeout_s}s "
                   f"(last progress={state['last_progress']}%) -> step FAILED")
        return False
    except Exception as e:
        if state["done_ok"]:
            log("OK", f"{target_label} update step SUCCESS  ({state['done_reason']})")
            return True
        log("FAIL", f"FirmwareUpdate exception: {e}")
        return False
    finally:
        dev.on_unsolicited = None


def do_firmware_update_check(dev: WebUsbDevice, target_id: int, path: str,
                             reboot_on_success: bool = False,
                             timeout_s: int = 120) -> bool:
    """Send FirmwareUpdate and wait for Success/Failure reply (used in step1)."""
    log("INFO", f"FirmwareUpdate target={target_id} ({FW_TARGET_NAME.get(target_id,'?')}) path={path} reboot={reboot_on_success}")

    def _on_progress(mt: int, payload: bytes) -> None:
        if mt == PB_MSG_TYPE["FirmwareInstallProgress"]:
            p = decode_firmware_install_progress(payload)
            stage_str = f" [{p['stage']}]" if p["stage"] else ""
            log("PROG", f"{FW_TARGET_NAME.get(p['target_id'], p['target_id'])}: {p['progress']}%{stage_str}")
        else:
            log("INFO", f"unsolicited msg_type={mt} ({PB_MSG_NAME.get(mt,'?')})")

    dev.on_unsolicited = _on_progress
    try:
        pb_payload = encode_firmware_update(
            [{"target_id": target_id, "path": path}],
            reboot_on_success=reboot_on_success,
        )
        msg_type, payload = dev.send_and_recv(
            PB_MSG_TYPE["FirmwareUpdate"], pb_payload, timeout_ms=timeout_s * 1000,
            expected_reply_types={PB_MSG_TYPE["Success"], PB_MSG_TYPE["Failure"]},
        )
        if msg_type == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            log("OK", f"FirmwareUpdate success: \"{decoded['message']}\"")
            return True
        decoded = decode_failure(payload)
        log("FAIL", f"FirmwareUpdate failure: code={decoded['code']} msg=\"{decoded['message']}\"")
        return False
    except Exception as e:
        log("FAIL", f"FirmwareUpdate exception: {e}")
        return False
    finally:
        try:
            dev.drain_unsolicited(300)
        except Exception:
            pass
        dev.on_unsolicited = None


def do_firmware_update_wait_progress(dev: WebUsbDevice, target_id: int, path: str,
                                     max_wait_s: int = PROGRESS_WAIT_S,
                                     idle_timeout_s: int = PROGRESS_IDLE_S,
                                     ignore_errors: bool = False) -> bool:
    """Send FirmwareUpdate and treat the step as successful as soon as a
    FirmwareInstallProgress frame reports progress >= 100 %.

    workflow.md says: 'do not judge firmware_update's reply; if FirmwareInstallProgress
    reaches 100 % the step is considered successful'. So:
      - the immediate FirmwareUpdate reply (Success / Failure) is logged but IGNORED
        for the success decision
      - returning True only requires progress = 100
      - returning False happens on idle timeout or overall timeout

    When ``ignore_errors`` is True (step4), USB I/O errors and other exceptions during
    the wait are logged as WARN and the workflow continues (returns True).
    """
    target_label = FW_TARGET_NAME.get(target_id, str(target_id))
    log("INFO", f"FirmwareUpdate target={target_id} ({target_label}) path={path}")
    if ignore_errors:
        log("INFO", "  success criterion: progress=100% preferred; USB/errors ignored (step4)")
    else:
        log("INFO", "  success criterion: FirmwareInstallProgress reaches 100% (firmware_update reply is ignored)")
    state = {"done": False, "last_progress": -1, "last_recv": time.monotonic()}

    def _on_any(mt: int, payload: bytes) -> None:
        state["last_recv"] = time.monotonic()
        # Once we've already declared success, swallow any trailing frames silently.
        if state["done"]:
            return
        if mt == PB_MSG_TYPE["FirmwareInstallProgress"]:
            p = decode_firmware_install_progress(payload)
            if p["progress"] != state["last_progress"]:
                stage_str = f" [{p['stage']}]" if p["stage"] else ""
                tag = FW_TARGET_NAME.get(p["target_id"], p["target_id"])
                log("PROG", f"FirmwareInstallProgress  {tag}: {p['progress']}%{stage_str}")
                state["last_progress"] = p["progress"]
            if p["progress"] >= 100:
                state["done"] = True
        elif mt == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            log("INFO", f"  (ignored) FirmwareUpdate reply = Success: \"{decoded['message']}\"")
        elif mt == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            log("INFO", f"  (ignored) FirmwareUpdate reply = Failure: code={decoded['code']} msg=\"{decoded['message']}\"")
        else:
            log("INFO", f"  (ignored) unsolicited msg_type={mt} ({PB_MSG_NAME.get(mt,'?')})")

    dev.on_unsolicited = _on_any
    try:
        # Dispatch the FirmwareUpdate request. We send the frame directly so we don't
        # tie ourselves to a single reply type — the install loop produces multiple frames
        # (progress, then Success) and may come in any order with our progress watcher.
        from onekey_webusb import build_pb_frame  # local import to avoid top clutter
        pb_payload = encode_firmware_update(
            [{"target_id": target_id, "path": path}],
            reboot_on_success=False,
        )
        frame = build_pb_frame(dev.framer, PB_MSG_TYPE["FirmwareUpdate"], pb_payload)
        dev.dev.write(dev.ep_out.bEndpointAddress, frame, timeout=5000)
        log("INFO", "  FirmwareUpdate request dispatched; waiting for progress=100%...")

        deadline = time.monotonic() + max_wait_s
        while time.monotonic() < deadline:
            # Drain in small slices so we can check idle timeout and done flag.
            # Once progress=100% arrives we return immediately — at that point the
            # device often starts the install/reboot, which will make any further
            # IN transfer fail with EPIPE. That is expected and must not pollute
            # the step's success log.
            try:
                dev.drain_unsolicited(500)
            except Exception as e:
                if state["done"]:
                    pass  # device tearing down post-100%, ignore
                elif ignore_errors:
                    log("WARN",
                        f"FirmwareUpdate I/O during progress wait (ignored): {e} "
                        f"(last progress={state['last_progress']}%)")
                    return True
                else:
                    raise
            if state["done"]:
                log("OK", f"FirmwareInstallProgress reached 100% -> {target_label} update step SUCCESS")
                return True
            if time.monotonic() - state["last_recv"] > idle_timeout_s:
                msg = (f"FirmwareInstallProgress idle for {idle_timeout_s}s "
                       f"(last progress={state['last_progress']}%)")
                if ignore_errors:
                    log("WARN", f"{msg} -> ignored, continuing step4")
                    return True
                log("FAIL", f"{msg} -> step FAILED")
                return False
        msg = (f"FirmwareInstallProgress did not reach 100% within {max_wait_s}s "
               f"(last progress={state['last_progress']}%)")
        if ignore_errors:
            log("WARN", f"{msg} -> ignored, continuing step4")
            return True
        log("FAIL", f"{msg} -> step FAILED")
        return False
    except Exception as e:
        # If 100% was already observed, the exception is just the device tearing
        # down USB after success — treat as success and don't print FAIL.
        if state["done"]:
            log("OK", f"FirmwareInstallProgress reached 100% -> {target_label} update step SUCCESS")
            return True
        if ignore_errors:
            log("WARN", f"FirmwareUpdate exception (ignored): {e} "
                f"(last progress={state['last_progress']}%)")
            return True
        log("FAIL", f"FirmwareUpdate exception: {e}")
        return False
    finally:
        dev.on_unsolicited = None


def do_path_info(dev: WebUsbDevice, path: str) -> Optional[dict]:
    """Query PathInfo for `path`. Return the decoded dict on success, None on error.

    The 'exist' field of the returned dict tells whether the path exists on device.
    """
    log("INFO", f"PathInfo: \"{path}\"")
    try:
        pb_payload = encode_path_info_query(path)
        msg_type, payload = dev.send_and_recv(
            PB_MSG_TYPE["PathInfoQuery"], pb_payload, timeout_ms=5000
        )
        if msg_type == PB_MSG_TYPE["PathInfo"]:
            info = decode_path_info(payload)
            log("INFO", f"  exist={info['exist']} size={info['size']} dir={info['directory']}")
            return info
        if msg_type == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            log("WARN", f"PathInfo Failure: code={decoded['code']} msg=\"{decoded['message']}\"")
            return None
        log("WARN", f"PathInfo unexpected msg_type={msg_type} ({PB_MSG_NAME.get(msg_type,'?')})")
        return None
    except Exception as e:
        log("FAIL", f"PathInfo exception: {e}")
        return None


def do_file_delete(dev: WebUsbDevice, path: str) -> bool:
    log("INFO", f"FileDelete: \"{path}\"")
    try:
        pb_payload = encode_file_delete(path)
        msg_type, payload = dev.send_and_recv(
            PB_MSG_TYPE["FileDelete"], pb_payload, timeout_ms=10000
        )
        if msg_type == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            log("OK", f"FileDelete success: \"{decoded['message']}\"")
            return True
        if msg_type == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            log("FAIL", f"FileDelete failure: code={decoded['code']} msg=\"{decoded['message']}\"")
            return False
        log("FAIL", f"FileDelete unexpected msg_type={msg_type} ({PB_MSG_NAME.get(msg_type,'?')})")
        return False
    except Exception as e:
        log("FAIL", f"FileDelete exception: {e}")
        return False


def do_reboot(dev: WebUsbDevice, reboot_type: int = 0) -> bool:
    log("INFO", f"Reboot type={reboot_type}")
    try:
        pb_payload = encode_reboot(reboot_type)
        msg_type, payload = dev.send_and_recv(
            PB_MSG_TYPE["Reboot"], pb_payload, timeout_ms=5000
        )
        if msg_type == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            log("OK", f"Reboot success: \"{decoded['message']}\"")
            return True
        if msg_type == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            log("FAIL", f"Reboot failure: code={decoded['code']} msg=\"{decoded['message']}\"")
            return False
        log("WARN", f"Reboot unexpected msg_type={msg_type}, treat as success (device likely rebooting)")
        return True
    except TimeoutError:
        log("WARN", "Reboot: no response (device may have rebooted already) - treat as success")
        return True
    except Exception as e:
        log("FAIL", f"Reboot exception: {e}")
        return False


def do_disk_control(dev: WebUsbDevice, enable: int) -> bool:
    """Send FilesystemDiskControl. enable=1 -> Enable MSC, enable=0 -> Disable MSC.
    Returns True on Success reply, False otherwise.
    """
    label = DISK_CTRL_NAME.get(enable, str(enable))
    log("INFO", f"FilesystemDiskControl enable={enable} ({label})")
    try:
        pb_payload = encode_disk_control(enable)
        msg_type, payload = dev.send_and_recv(
            PB_MSG_TYPE["FilesystemDiskControl"], pb_payload, timeout_ms=10000
        )
        if msg_type == PB_MSG_TYPE["Success"]:
            decoded = decode_success(payload)
            log("OK", f"FilesystemDiskControl success: \"{decoded['message']}\"")
            return True
        if msg_type == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(payload)
            log("FAIL", f"FilesystemDiskControl failure: code={decoded['code']} msg=\"{decoded['message']}\"")
            return False
        log("FAIL", f"FilesystemDiskControl unexpected msg_type={msg_type} ({PB_MSG_NAME.get(msg_type,'?')})")
        return False
    except Exception as e:
        log("FAIL", f"FilesystemDiskControl exception: {e}")
        return False


# ==================== standalone prelude ====================

def run_standalone_prelude(step_label: str) -> Optional[WebUsbDevice]:
    """Per workflow.md, step2/3/4 invoked standalone must:
      connect -> reboot type=1 -> wait 1s -> reconnect (60s)
    Returns the reconnected dev handle, or None on failure (caller should treat
    None as a fatal precondition failure for the standalone run).
    """
    stage(f"{step_label} standalone prelude - reboot type=1 then reconnect")
    dev: Optional[WebUsbDevice] = None
    try:
        substep(f"{step_label}.pre.1", "Connect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label=f"{step_label}.prelude.connect-1")

        substep(f"{step_label}.pre.2", f"Reboot type=1, then wait {STANDALONE_POST_REBOOT_WAIT_S}s")
        if not do_reboot(dev, reboot_type=1):
            safe_close(dev)
            return None
        safe_close(dev)
        dev = None
        time.sleep(STANDALONE_POST_REBOOT_WAIT_S)

        substep(f"{step_label}.pre.3", "Re-connect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label=f"{step_label}.prelude.connect-2")
        return dev
    except Exception as e:
        log("FAIL", f"{step_label} standalone prelude exception: {e}")
        safe_close(dev)
        return None


# ==================== asset enumeration ====================

def wait_for_volume(label: str = ONEKEY_VOLUME_LABEL,
                    timeout_s: int = STEP2_VOLUME_WAIT_S) -> Optional[str]:
    """Poll the host until a mounted volume with the given label appears, or timeout.

    Returns the volume mount path as a string on success, or None on timeout.
    Relies on find_volume_by_label from copy_assets.py for the cross-platform lookup.
    """
    try:
        from copy_assets import find_volume_by_label
    except Exception as e:
        log("FAIL", f"cannot import find_volume_by_label from copy_assets.py: {e}")
        return None

    log("INFO", f"Scanning for volume \"{label}\" (timeout {timeout_s}s)...")
    deadline = time.monotonic() + timeout_s
    attempt = 0
    while time.monotonic() < deadline:
        attempt += 1
        matches = find_volume_by_label(label)
        if matches:
            if len(matches) > 1:
                log("WARN", f"Multiple volumes match \"{label}\": {matches} - using {matches[0]}")
            mount = str(matches[0])
            log("OK", f"Volume \"{label}\" found at {mount} (attempt {attempt})")
            return mount
        remaining = deadline - time.monotonic()
        if attempt == 1 or attempt % 5 == 0:
            log("INFO", f"  not yet visible, {remaining:.1f}s left")
        time.sleep(1.0)
    log("FAIL", f"Volume \"{label}\" did not appear within {timeout_s}s")
    return None


def do_copy_assets(mount: Optional[str] = None) -> bool:
    """Run copy_assets.py as a subprocess to wipe + mirror ./assets onto the MSC volume.

    If `mount` is given, pass it as --dest. Otherwise let the subprocess auto-locate by
    --label. Passing --dest is safer here: when the MSC volume has just appeared on the
    host, a cold subprocess that scans by label can race with the OS still finishing the
    mount and the label may briefly read empty.

    Returns True on exit code 0, False otherwise. Streams subprocess stdout into our log
    so progress is visible. Times out after COPY_ASSETS_TIMEOUT_S.
    """
    cmd = [sys.executable, COPY_ASSETS_SCRIPT]
    if mount:
        cmd += ["--dest", str(mount)]
    else:
        cmd += ["--label", ONEKEY_VOLUME_LABEL]
    cmd += ["--yes", "--workers", str(COPY_ASSETS_WORKERS)]
    log("INFO", f"Launching: {' '.join(cmd)}")
    t0 = time.monotonic()
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
        )
    except Exception as e:
        log("FAIL", f"failed to launch copy_assets.py: {e}")
        return False

    deadline = t0 + COPY_ASSETS_TIMEOUT_S
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                sys.stdout.write(f"  [copy_assets] {line}\n")
                sys.stdout.flush()
            if time.monotonic() > deadline:
                log("FAIL", f"copy_assets.py exceeded {COPY_ASSETS_TIMEOUT_S}s, killing")
                proc.kill()
                proc.wait(timeout=5)
                return False
        rc = proc.wait()
    except Exception as e:
        log("FAIL", f"copy_assets.py exception: {e}")
        try:
            proc.kill()
        except Exception:
            pass
        return False

    elapsed = time.monotonic() - t0
    if rc == 0:
        log("OK", f"copy_assets.py finished in {elapsed:.1f}s")
        return True
    log("FAIL", f"copy_assets.py exited with code {rc} after {elapsed:.1f}s")
    return False


def enumerate_assets(assets_dir: str):
    """Yield (abs_local_path, device_relative_path) pairs.

    device_relative_path uses forward slashes and does NOT include the 'assets/' prefix.
    e.g. assets/core.bin           -> 'core.bin'
         assets/font/foo.bin       -> 'font/foo.bin'
    """
    if not os.path.isdir(assets_dir):
        return
    for root, _dirs, files in os.walk(assets_dir):
        for name in files:
            if name in _IGNORED_BASENAMES:
                continue
            abs_path = os.path.join(root, name)
            rel = os.path.relpath(abs_path, assets_dir).replace(os.sep, "/")
            yield abs_path, rel


# ==================== STEP 1 ====================

def run_step1_once(attempt_no: int) -> bool:
    stage(f"STEP1 attempt #{attempt_no} - update romloader")
    dev: Optional[WebUsbDevice] = None
    try:
        substep("1.1", "Connect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label="step1.connect")

        substep("1.2", "Ping device (timeout 60s)")
        if not do_ping(dev, PING_TIMEOUT_S, tag="step1"):
            return False

        substep("1.3", f"Delete {STEP1_BOOT_LOGO_PATH} if it exists")
        info = do_path_info(dev, STEP1_BOOT_LOGO_PATH)
        if info is None:
            return False
        if info["exist"]:
            if not do_file_delete(dev, STEP1_BOOT_LOGO_PATH):
                return False
        else:
            log("INFO", f"{STEP1_BOOT_LOGO_PATH} does not exist; nothing to delete")

        substep("1.4", f"FileWrite bin/pro2_romloader_v3_msc.bin -> vol0:romloader.bin (chunk {CHUNK_STEP1})")
        if not do_file_write(dev, ROMLOADER_BIN, "vol0:romloader.bin", CHUNK_STEP1):
            return False

        log("INFO", "Waiting 1s between 1.4 and 1.5...")
        time.sleep(1.0)

        substep("1.5", f"FileWrite bin/pro2_boot_update_rom_signed.bin -> vol0:update_rom.bin (chunk {CHUNK_STEP1})")
        if not do_file_write(dev, UPDATE_ROM_BIN, "vol0:update_rom.bin", CHUNK_STEP1):
            return False

        substep("1.6", "FirmwareUpdate type=1 path=vol0:update_rom.bin (reply=Success OR progress=100%)")
        if not do_firmware_update_either(dev, target_id=1, path="vol0:update_rom.bin", timeout_s=120):
            return False

        substep("1.7", f"Reboot type=0, then wait {STEP1_POST_REBOOT_S}s")
        if not do_reboot(dev, reboot_type=0):
            return False
        log("INFO", f"Reboot issued, waiting {STEP1_POST_REBOOT_S}s...")
        safe_close(dev)
        dev = None
        time.sleep(STEP1_POST_REBOOT_S)

        substep("1.8", f"Connect device (timeout {CONNECT_TIMEOUT_S}s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label="step1.connect-2")

        substep("1.9", f"Reboot type=0, then wait {STEP1_POST_REBOOT2_S}s")
        if not do_reboot(dev, reboot_type=0):
            return False
        log("INFO", f"Reboot issued, waiting {STEP1_POST_REBOOT2_S}s before step2...")
        safe_close(dev)
        dev = None
        time.sleep(STEP1_POST_REBOOT2_S)
        log("OK", "Step1 finished.")
        return True
    except Exception as e:
        log("FAIL", f"Step1 exception: {e}")
        return False
    finally:
        safe_close(dev)


def run_step1(max_attempts: int = DEFAULT_MAX_ATTEMPTS) -> int:
    stage("Workflow START - step1: update romloader")
    log("INFO", f"Romloader bin : {ROMLOADER_BIN}")
    log("INFO", f"Update-rom bin: {UPDATE_ROM_BIN}")
    log("INFO", f"Chunk size    : {CHUNK_STEP1}")
    log("INFO", f"Max attempts  : {max_attempts}")

    for bin_path in (ROMLOADER_BIN, UPDATE_ROM_BIN):
        if not os.path.isfile(bin_path):
            log("FAIL", f"Required file missing: {bin_path}")
            return 2

    for i in range(1, max_attempts + 1):
        if run_step1_once(i):
            stage("STEP1 SUCCESS")
            return 0
        if i < max_attempts:
            log("WARN", f"Step1 attempt #{i} failed; retrying from beginning...")
        else:
            log("WARN", f"Step1 attempt #{i} failed; no retries left.")
        time.sleep(2.0)
    stage("STEP1 FAILED")
    return 1


# ==================== STEP 2 ====================

def run_step2_once(attempt_no: int, dev_in: Optional[WebUsbDevice] = None) -> bool:
    stage(f"STEP2 attempt #{attempt_no} - update resources")
    dev: Optional[WebUsbDevice] = dev_in
    try:
        substep("2.1", "Ensure device connected (reuse if already connected, else connect 60s)")
        if dev is None:
            dev = wait_connect(CONNECT_TIMEOUT_S, label="step2.connect-1")
        else:
            log("INFO", "Device already connected; reusing existing handle")

        substep("2.2", f"sendDiskControl enable=1 (Enable MSC) [result ignored], then wait {STEP2_POST_MSC_ENABLE_WAIT_S}s")
        # workflow.md step2.2: 不判断返回结果。Older firmware may reply
        # "Handler not registered" because it auto-exposes MSC anyway.
        do_disk_control(dev, enable=1)
        # Release the WebUSB handle so the OS can mount MSC for copy_assets.
        safe_close(dev)
        dev = None
        log("INFO", f"MSC enable issued, waiting {STEP2_POST_MSC_ENABLE_WAIT_S}s for host to mount the disk...")
        time.sleep(STEP2_POST_MSC_ENABLE_WAIT_S)

        substep("2.3", f"Wait for OneKey OS volume (timeout {STEP2_VOLUME_WAIT_S}s), then wait {STEP2_POST_VOLUME_WAIT_S}s")
        mount = wait_for_volume(ONEKEY_VOLUME_LABEL, STEP2_VOLUME_WAIT_S)
        if mount is None:
            return False
        log("INFO", f"Volume ready, waiting {STEP2_POST_VOLUME_WAIT_S}s before copy_assets...")
        time.sleep(STEP2_POST_VOLUME_WAIT_S)

        substep("2.4", f"Copy ./assets to {mount} via copy_assets.py, then wait {STEP2_POST_COPY_WAIT_S}s")
        if not os.path.isdir(ASSETS_DIR):
            raise WorkflowFatal(f"Assets dir missing: {ASSETS_DIR}")
        if not os.path.isfile(COPY_ASSETS_SCRIPT):
            raise WorkflowFatal(f"copy_assets.py missing: {COPY_ASSETS_SCRIPT}")

        if not do_copy_assets(mount=mount):
            # workflow.md: any failure here -> EXIT (no retry)
            raise WorkflowFatal("copy_assets.py failed; aborting workflow.")

        log("INFO", f"Asset copy done, waiting {STEP2_POST_COPY_WAIT_S}s before reconnect...")
        time.sleep(STEP2_POST_COPY_WAIT_S)

        substep("2.5", "Reconnect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label="step2.connect-2")

        substep("2.6", f"sendDiskControl enable=0 (Disable MSC) [result ignored], then wait {STEP2_POST_MSC_DISABLE_WAIT_S}s")
        # workflow.md step2.6: 不判断返回结果.
        do_disk_control(dev, enable=0)
        log("INFO", f"MSC disable issued, waiting {STEP2_POST_MSC_DISABLE_WAIT_S}s before step3...")
        time.sleep(STEP2_POST_MSC_DISABLE_WAIT_S)

        log("OK", "Step2 finished.")
        return True
    except WorkflowFatal:
        raise  # bubble up so the workflow aborts immediately, no retry
    except Exception as e:
        log("FAIL", f"Step2 exception: {e}")
        return False
    finally:
        safe_close(dev)


def run_step2(max_attempts: int = DEFAULT_MAX_ATTEMPTS, standalone: bool = False) -> int:
    stage("Workflow START - step2: update resources")
    log("INFO", f"Assets dir    : {ASSETS_DIR}")
    log("INFO", f"Volume label  : \"{ONEKEY_VOLUME_LABEL}\"")
    log("INFO", f"Max attempts  : {max_attempts}")

    if not os.path.isdir(ASSETS_DIR):
        log("FAIL", f"Required dir missing: {ASSETS_DIR}")
        return 2

    prelude_dev: Optional[WebUsbDevice] = None
    if standalone:
        prelude_dev = run_standalone_prelude("step2")
        if prelude_dev is None:
            stage("STEP2 FAILED")
            return 1

    for i in range(1, max_attempts + 1):
        carry = prelude_dev if i == 1 else None
        prelude_dev = None  # only consumed once
        if run_step2_once(i, dev_in=carry):
            stage("STEP2 SUCCESS")
            return 0
        if i < max_attempts:
            log("WARN", f"Step2 attempt #{i} failed; retrying from beginning...")
        else:
            log("WARN", f"Step2 attempt #{i} failed; no retries left.")
        time.sleep(2.0)
    stage("STEP2 FAILED")
    return 1


# ==================== STEP 3 ====================

def run_step3_once(attempt_no: int, dev_in: Optional[WebUsbDevice] = None) -> bool:
    stage(f"STEP3 attempt #{attempt_no} - update bluetooth")
    dev: Optional[WebUsbDevice] = dev_in
    try:
        substep("3.1", "Ensure device connected (reuse if already connected, else connect 60s)")
        if dev is None:
            dev = wait_connect(CONNECT_TIMEOUT_S, label="step3.connect")
        else:
            log("INFO", "Device already connected; reusing existing handle")

        substep("3.2", f"Ping device (timeout 60s), then wait {STEP3_POST_PING_WAIT_S}s")
        if not do_ping(dev, PING_TIMEOUT_S, tag="step3"):
            return False
        log("INFO", f"Ping OK, waiting {STEP3_POST_PING_WAIT_S}s before next step...")
        time.sleep(STEP3_POST_PING_WAIT_S)

        substep("3.3", "Ensure vol0:bluetooth.bin exists (write bin/pro2_bluetooth_signed.bin if missing or query timed out)")
        info = do_path_info(dev, "vol0:bluetooth.bin")
        # workflow.md step3.3: 如果指令超时或者不存在 -> write the bin.
        # info=None covers PathInfo timeout / Failure / unexpected reply.
        needs_write = info is None or not info.get("exist", False)
        if not needs_write:
            log("INFO", "vol0:bluetooth.bin already exists; skipping file_write")
        else:
            if info is None:
                log("INFO", "PathInfo for vol0:bluetooth.bin failed/timed out; treating as missing and writing")
            else:
                log("INFO", f"vol0:bluetooth.bin missing; writing {BLUETOOTH_BIN}")
            if not os.path.isfile(BLUETOOTH_BIN):
                log("FAIL", f"Bluetooth bin missing on host: {BLUETOOTH_BIN}")
                return False
            if not do_file_write(dev, BLUETOOTH_BIN, "vol0:bluetooth.bin", CHUNK_STEP3):
                return False

        substep("3.4", "FirmwareUpdate type=2 path=vol0:bluetooth.bin (wait progress=100%)")
        if not do_firmware_update_wait_progress(dev, target_id=2, path="vol0:bluetooth.bin"):
            return False

        substep("3.5", f"Wait {STEP3_POST_COMPLETE_WAIT_S}s, then enter step4")
        safe_close(dev)
        dev = None
        log("INFO", f"Waiting {STEP3_POST_COMPLETE_WAIT_S}s before step4...")
        time.sleep(STEP3_POST_COMPLETE_WAIT_S)

        log("OK", "Step3 finished.")
        return True
    except Exception as e:
        log("FAIL", f"Step3 exception: {e}")
        return False
    finally:
        safe_close(dev)


def run_step3(max_attempts: int = DEFAULT_MAX_ATTEMPTS,
              dev_in: Optional[WebUsbDevice] = None,
              standalone: bool = False) -> int:
    stage("Workflow START - step3: update bluetooth")
    log("INFO", f"Bluetooth bin : {BLUETOOTH_BIN}")
    log("INFO", f"Max attempts  : {max_attempts}")

    if not os.path.isfile(BLUETOOTH_BIN):
        log("FAIL", f"Required file missing: {BLUETOOTH_BIN}")
        return 2

    if standalone:
        prelude_dev = run_standalone_prelude("step3")
        if prelude_dev is None:
            stage("STEP3 FAILED")
            return 1
        dev_in = prelude_dev

    for i in range(1, max_attempts + 1):
        # Only the first attempt may reuse an incoming device handle; if it fails
        # we restart from a fresh connect on subsequent attempts.
        carry = dev_in if i == 1 else None
        dev_in = None  # only consumed once
        if run_step3_once(i, dev_in=carry):
            stage("STEP3 SUCCESS")
            return 0
        if i < max_attempts:
            log("WARN", f"Step3 attempt #{i} failed; retrying from beginning...")
        else:
            log("WARN", f"Step3 attempt #{i} failed; no retries left.")
        time.sleep(2.0)
    stage("STEP3 FAILED")
    return 1


# ==================== STEP 4 ====================

def run_step4_once(attempt_no: int) -> bool:
    stage(f"STEP4 attempt #{attempt_no} - update firmware")
    dev: Optional[WebUsbDevice] = None
    try:
        substep("4.1", "Connect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label="step4.connect-1")

        substep("4.2", f"Reboot type=1, then wait {STEP4_POST_REBOOT_WAIT_S}s")
        if not do_reboot(dev, reboot_type=1):
            return False
        safe_close(dev)
        dev = None
        time.sleep(STEP4_POST_REBOOT_WAIT_S)

        substep("4.3", "Re-connect device (timeout 60s)")
        dev = wait_connect(CONNECT_TIMEOUT_S, label="step4.connect-2")

        substep("4.4", f"Ping device (timeout 60s), then wait {STEP4_POST_PING_WAIT_S}s")
        if not do_ping(dev, PING_TIMEOUT_S, tag="step4"):
            return False
        log("INFO", f"Ping OK, waiting {STEP4_POST_PING_WAIT_S}s before next step...")
        time.sleep(STEP4_POST_PING_WAIT_S)

        substep("4.5", "Ensure vol0:core.bin exists (write bin/pro2_firmware_signed.bin if missing or query timed out)")
        info = do_path_info(dev, "vol0:core.bin")
        # workflow.md step4.5: 如果指令超时或者不存在 -> write the bin.
        # info=None covers PathInfo timeout / Failure / unexpected reply.
        needs_write = info is None or not info.get("exist", False)
        if not needs_write:
            log("INFO", "vol0:core.bin already exists; skipping file_write")
        else:
            if info is None:
                log("INFO", "PathInfo for vol0:core.bin failed/timed out; treating as missing and writing")
            else:
                log("INFO", f"vol0:core.bin missing; writing {FIRMWARE_BIN}")
            if not os.path.isfile(FIRMWARE_BIN):
                raise WorkflowFatal(f"firmware bin missing on host: {FIRMWARE_BIN}")
            if not do_file_write(dev, FIRMWARE_BIN, "vol0:core.bin", CHUNK_STEP1):
                raise WorkflowFatal("Failed to write vol0:core.bin; aborting workflow.")

        substep("4.6", "FirmwareUpdate type=1 path=vol0:core.bin (wait progress=100%, errors ignored)")
        do_firmware_update_wait_progress(
            dev, target_id=1, path="vol0:core.bin", ignore_errors=True,
        )

        substep("4.7", f"Wait {STEP4_PRE_CONNECT_S}s, then connect device (timeout {STEP4_FINAL_CONNECT_TIMEOUT_S}s)")
        safe_close(dev)
        dev = None
        log("INFO", f"Waiting {STEP4_PRE_CONNECT_S}s before final connect...")
        time.sleep(STEP4_PRE_CONNECT_S)
        dev = wait_connect(STEP4_FINAL_CONNECT_TIMEOUT_S, label="step4.connect-final")

        safe_close(dev)
        dev = None
        log("OK", "Step4 finished.")
        return True
    except WorkflowFatal:
        raise
    except Exception as e:
        log("FAIL", f"Step4 exception: {e}")
        return False
    finally:
        safe_close(dev)


def run_step4(max_attempts: int = DEFAULT_MAX_ATTEMPTS) -> int:
    stage("Workflow START - step4: update firmware")
    log("INFO", f"Firmware bin  : {FIRMWARE_BIN}")
    log("INFO", f"Max attempts  : {max_attempts}")

    if not os.path.isfile(FIRMWARE_BIN):
        log("FAIL", f"Required file missing: {FIRMWARE_BIN}")
        return 2

    for i in range(1, max_attempts + 1):
        if run_step4_once(i):
            stage("STEP4 SUCCESS")
            return 0
        if i < max_attempts:
            log("WARN", f"Step4 attempt #{i} failed; retrying from beginning...")
        else:
            log("WARN", f"Step4 attempt #{i} failed; no retries left.")
        time.sleep(2.0)
    stage("STEP4 FAILED")
    return 1


# ==================== CLI ====================

def run_all(max_attempts: int = DEFAULT_MAX_ATTEMPTS) -> int:
    rc = run_step1(max_attempts)
    if rc != 0:
        return rc
    rc = run_step2(max_attempts)
    if rc != 0:
        return rc
    rc = run_step3(max_attempts)
    if rc != 0:
        # Fallback: re-run step3 as if invoked standalone (adds the
        # connect -> reboot type=1 -> wait 1s -> reconnect prelude).
        log("WARN", "Step3 failed in run_all; retrying once as standalone (with reboot prelude)...")
        rc = run_step3(max_attempts, standalone=True)
        if rc != 0:
            return rc
    rc = run_step4(max_attempts)
    if rc != 0:
        # step4 already embeds connect -> reboot type=1 -> reconnect in its body,
        # so "re-running workflow.py step4" is just another run_step4 invocation.
        log("WARN", "Step4 failed in run_all; retrying step4 once more...")
        rc = run_step4(max_attempts)
        if rc != 0:
            return rc
    stage("ALL STEPS FINISHED SUCCESSFULLY")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="workflow_step1",
        description="OneKey Pro 2 update workflow runner (step1/step2/step3/step4/all)",
    )
    p.add_argument("target",
                   nargs="?",
                   default="all",
                   choices=["all", "step1", "step2", "step3", "step4"],
                   help="which part of the workflow to run (default: all)")
    p.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS,
                   help=f"max retries per step (default {DEFAULT_MAX_ATTEMPTS})")
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        if args.target == "all":
            return run_all(args.max_attempts)
        if args.target == "step1":
            return run_step1(args.max_attempts)
        if args.target == "step2":
            return run_step2(args.max_attempts, standalone=True)
        if args.target == "step3":
            return run_step3(args.max_attempts, standalone=True)
        if args.target == "step4":
            return run_step4(args.max_attempts)
    except WorkflowFatal as e:
        stage("WORKFLOW ABORTED")
        log("FAIL", str(e))
        return 3
    return 2


if __name__ == "__main__":
    sys.exit(main())
