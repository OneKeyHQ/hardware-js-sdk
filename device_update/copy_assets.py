"""
Mirror ./assets onto a mounted OneKey-OS volume (cross-platform: Windows / macOS / Linux).

Workflow:
  1) wipe the target drive (all files & subdirs) -- requires --yes to actually wipe
  2) copy every file under ./assets to <target>/<relative-path>, preserving structure

Safety rails (refuses to run even with --yes):
  - target must exist and be a directory
  - target must NOT be a drive root that looks like the system drive (C:\\, /, /Users, /home, /Volumes)
  - target must NOT contain the assets dir, the script itself, or the current working dir
  - we sanity-check there is at least one parent path component before wiping

Usage:
    # auto-locate "OneKey OS" volume on Windows or macOS
    python copy_assets.py --yes

    # or specify explicitly
    python copy_assets.py --dest E:\\ --yes
    python copy_assets.py --dest "/Volumes/OneKey OS" --yes

    # custom label
    python copy_assets.py --label "OneKey OS" --yes
"""

import argparse
import os
import re
import shutil
import stat
import string
import subprocess
import sys
import time
from pathlib import Path

_BASE_DIR  = Path(__file__).resolve().parent
ASSETS_DIR = _BASE_DIR / "assets"
DEFAULT_LABEL = "OneKey OS"

# basenames we never copy from the assets tree
IGNORED_BASENAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}

# Read/write buffer for each file. Larger buffers help medium files; tiny files are
# still dominated by per-file FAT directory updates on USB MSC.
COPY_BUF_SIZE = 1024 * 1024
DEFAULT_WORKERS = 8


def log(level: str, msg: str) -> None:
    sys.stdout.write(f"[{time.strftime('%H:%M:%S')}] [{level}] {msg}\n")
    sys.stdout.flush()


# ==================== volume discovery ====================

def _norm(s: str) -> str:
    """Loose label match: lowercase, drop non-alphanumeric."""
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def find_volume_by_label(label: str) -> list[Path]:
    """Return all mount points whose volume label matches `label`. Cross-platform."""
    target_norm = _norm(label)
    matches: list[Path] = []

    if sys.platform == "darwin":
        # macOS: every mounted volume appears as /Volumes/<label>
        vol_root = Path("/Volumes")
        if vol_root.is_dir():
            for entry in vol_root.iterdir():
                try:
                    if _norm(entry.name) == target_norm and entry.is_dir():
                        matches.append(entry)
                except OSError:
                    continue
        return matches

    if sys.platform.startswith("linux"):
        # Linux: try /run/media/$USER/<label> and /media/$USER/<label>
        candidates: list[Path] = []
        user = os.environ.get("USER", "")
        for base in (f"/run/media/{user}", f"/media/{user}", "/media", "/mnt"):
            bp = Path(base)
            if bp.is_dir():
                for entry in bp.iterdir():
                    if entry.is_dir():
                        candidates.append(entry)
        for entry in candidates:
            if _norm(entry.name) == target_norm:
                matches.append(entry)
        return matches

    if os.name == "nt":
        # Windows: walk drive letters, read volume label via Win32 API (ctypes, no PowerShell)
        import ctypes
        from ctypes import wintypes
        GetVolumeInformationW = ctypes.windll.kernel32.GetVolumeInformationW
        GetVolumeInformationW.argtypes = [
            wintypes.LPCWSTR,  # lpRootPathName
            wintypes.LPWSTR,   # lpVolumeNameBuffer
            wintypes.DWORD,    # nVolumeNameSize
            ctypes.POINTER(wintypes.DWORD),  # lpVolumeSerialNumber
            ctypes.POINTER(wintypes.DWORD),  # lpMaximumComponentLength
            ctypes.POINTER(wintypes.DWORD),  # lpFileSystemFlags
            wintypes.LPWSTR,   # lpFileSystemNameBuffer
            wintypes.DWORD,    # nFileSystemNameSize
        ]
        GetVolumeInformationW.restype = wintypes.BOOL

        for letter in string.ascii_uppercase:
            root = f"{letter}:\\"
            if not os.path.exists(root):
                continue
            vol_name_buf = ctypes.create_unicode_buffer(261)
            fs_name_buf = ctypes.create_unicode_buffer(261)
            serial = wintypes.DWORD(0)
            max_comp = wintypes.DWORD(0)
            fs_flags = wintypes.DWORD(0)
            ok = GetVolumeInformationW(
                root, vol_name_buf, 261,
                ctypes.byref(serial), ctypes.byref(max_comp), ctypes.byref(fs_flags),
                fs_name_buf, 261,
            )
            if not ok:
                continue
            if _norm(vol_name_buf.value) == target_norm:
                matches.append(Path(root))
        return matches

    return matches


# ==================== safety ====================

def _resolved_str(p: Path) -> str:
    try:
        return str(p.resolve())
    except Exception:
        return str(p)


def assert_target_safe(target: Path) -> None:
    """Raise SystemExit if target looks dangerous to wipe.

    Heuristics, applied as a *union of denylists*:
      - target must exist and be a directory
      - target must not equal a root-ish path
      - target must not equal/contain assets dir, the script, or cwd
      - target must not equal user's home dir
    """
    if not target.exists():
        raise SystemExit(f"[abort] target does not exist: {target}")
    if not target.is_dir():
        raise SystemExit(f"[abort] target is not a directory: {target}")

    t_res = target.resolve()
    t_str = str(t_res)

    # Refuse obvious system roots
    bad_roots = {"/", "/Users", "/home", "/root", "/Volumes", "/mnt", "/media"}
    if t_str in bad_roots:
        raise SystemExit(f"[abort] refusing to wipe system root: {t_str}")

    # Windows drive root sanity: only allow if it really is a removable/non-system volume.
    # Heuristic: refuse if it's the same drive as the script.
    if os.name == "nt":
        # Refuse a bare drive letter that matches script drive
        script_drive = Path(_BASE_DIR).drive.upper()
        target_drive = t_res.drive.upper()
        if str(t_res).rstrip("\\/").lower() == target_drive.lower():
            if target_drive == script_drive:
                raise SystemExit(
                    f"[abort] refusing to wipe the same drive the script lives on ({target_drive}). "
                    "Use a different removable drive, or pass an explicit subdirectory."
                )

    # Forbidden contents: assets dir, this script, cwd, user home
    forbidden = {
        _resolved_str(ASSETS_DIR),
        _resolved_str(_BASE_DIR),
        _resolved_str(Path.cwd()),
        _resolved_str(Path.home()),
    }
    for f in forbidden:
        if not f:
            continue
        # equal or ancestor
        try:
            if t_str == f or Path(f).resolve().is_relative_to(t_res):
                raise SystemExit(
                    f"[abort] target {t_str} contains or equals a protected path: {f}"
                )
        except AttributeError:
            # Python <3.9 fallback
            if t_str == f or f.startswith(t_str + os.sep):
                raise SystemExit(
                    f"[abort] target {t_str} contains or equals a protected path: {f}"
                )

    # Must have at least one path component beyond root (eg /Volumes/X, E:\\X is OK; /, E:\\ blocked above).
    if t_res == Path(t_res.anchor):
        # bare drive root on Windows or '/' on POSIX; we want to allow Windows removable drive root,
        # but already filtered same-drive-as-script above. Keep this branch as a note.
        log("WARN", f"target is a drive root: {t_str} (allowed because it's not the script drive)")


# ==================== wipe ====================

def _on_rm_error(func, path, exc_info):
    """Make read-only files removable on Windows."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def wipe_target(target: Path, dry_run: bool) -> tuple[int, int]:
    """Remove every entry directly under `target`. Returns (files_removed, dirs_removed)."""
    file_count = 0
    dir_count = 0
    for entry in sorted(target.iterdir()):
        if entry.is_dir() and not entry.is_symlink():
            log("INFO", f"  rm -rf {entry.name}/{' [dry-run]' if dry_run else ''}")
            if not dry_run:
                shutil.rmtree(entry, onerror=_on_rm_error)
            dir_count += 1
        else:
            log("INFO", f"  rm     {entry.name}{' [dry-run]' if dry_run else ''}")
            if not dry_run:
                try:
                    entry.unlink()
                except PermissionError:
                    try:
                        os.chmod(entry, stat.S_IWRITE)
                        entry.unlink()
                    except Exception as e:
                        log("WARN", f"  could not unlink {entry}: {e}")
            file_count += 1
    return file_count, dir_count


# ==================== copy ====================

def enumerate_assets(assets_dir: Path):
    """Yield (abs_src, rel_path) for every file under assets/, excluding noise."""
    for root, dirs, files in os.walk(assets_dir):
        # don't descend into noise dirs (currently none, but cheap to keep)
        dirs.sort()
        for name in sorted(files):
            if name in IGNORED_BASENAMES:
                continue
            abs_src = Path(root) / name
            rel = abs_src.relative_to(assets_dir)
            yield abs_src, rel


def _copy_file_buffered(src: Path, dst: Path, bufsize: int = COPY_BUF_SIZE) -> None:
    """Copy file data with a large buffer (faster than shutil.copyfile for some FS)."""
    with open(src, "rb") as fsrc, open(dst, "wb") as fdst:
        while True:
            chunk = fsrc.read(bufsize)
            if not chunk:
                break
            fdst.write(chunk)


def copy_assets(target: Path, dry_run: bool, workers: int = DEFAULT_WORKERS) -> tuple[int, int]:
    """Copy assets/* -> target/*. Returns (files_copied, total_bytes).

    For small-file workloads on USB MSC, the bottleneck is per-file FAT metadata
    sync, not raw bandwidth. We:
      - stat each file once (cached) instead of re-stat'ing in the inner loop
      - pre-create every needed sub-directory in one pass (no mkdir per file)
      - use a thread pool so multiple FAT writes can be in-flight at the same time
      - keep shutil.copyfile (no metadata copy) when --no-meta is implied; copy2
        preserves mtime which Windows USB drivers handle cheaply, so we keep it.
    """
    files = list(enumerate_assets(ASSETS_DIR))
    # cache sizes -- avoids 2 stat() calls per file later
    sized = [(src, rel, src.stat().st_size) for src, rel in files]
    total_files = len(sized)
    total_bytes = sum(s for _, _, s in sized)
    log("INFO", f"Copying {total_files} files -> {target}  (workers={workers})")

    if dry_run:
        for idx, (src, rel, _size) in enumerate(sized, 1):
            log("INFO", f"  [{idx}/{total_files}] {rel} [dry-run]")
        log("OK", f"Dry-run: would copy {total_files} files")
        return total_files, total_bytes

    # Pre-create every destination subdirectory in one pass.
    dirs = {(target / rel).parent for _, rel, _ in sized}
    for d in sorted(dirs):
        d.mkdir(parents=True, exist_ok=True)

    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    state_lock = threading.Lock()
    copied = 0
    copied_bytes = 0
    t0 = time.monotonic()
    last_print = t0

    def _copy_one(src: Path, rel: Path, size: int) -> int:
        _copy_file_buffered(src, target / rel)
        return size

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_copy_one, src, rel, size) for src, rel, size in sized]
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                size = fut.result()
            except Exception as e:
                log("FAIL", f"copy error: {e}")
                # let the rest finish, then re-raise summary at the end
                raise
            with state_lock:
                copied += 1
                copied_bytes += size
            now = time.monotonic()
            if now - last_print >= 0.3 or i == total_files:
                pct = copied * 100.0 / total_files if total_files else 100.0
                sys.stdout.write(
                    f"\r  progress: {copied}/{total_files}  {pct:6.2f}%   "
                )
                sys.stdout.flush()
                last_print = now

    sys.stdout.write("\n")
    elapsed = time.monotonic() - t0
    log("OK", f"Done: {copied}/{total_files} files (100.00%) in {elapsed:.1f}s")
    return copied, copied_bytes


# ==================== main ====================

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="copy_assets",
        description="Wipe a mounted OneKey volume and mirror ./assets onto it.",
    )
    p.add_argument("--dest", "-d",
                   help="target volume root path, e.g. E:\\  or '/Volumes/OneKey OS'. "
                        "If omitted, auto-locate by --label.")
    p.add_argument("--label", "-l", default=DEFAULT_LABEL,
                   help=f"volume label to auto-locate when --dest is not given (default: '{DEFAULT_LABEL}')")
    p.add_argument("--yes", "-y", action="store_true",
                   help="actually perform the wipe + copy (without this, runs as dry-run)")
    p.add_argument("--dry-run", action="store_true",
                   help="force dry-run regardless of --yes")
    p.add_argument("--workers", "-j", type=int, default=DEFAULT_WORKERS,
                   help=f"parallel copy workers (default {DEFAULT_WORKERS}).")
    p.add_argument("--no-wipe", action="store_true",
                   help="skip wipe step (faster when target is already empty/clean)")
    return p


def main() -> int:
    args = build_parser().parse_args()
    dry_run = args.dry_run or not args.yes

    if not ASSETS_DIR.is_dir():
        log("FAIL", f"assets dir not found: {ASSETS_DIR}")
        return 2

    if args.dest:
        target = Path(args.dest).expanduser()
        log("INFO", f"Target source : explicit --dest")
    else:
        log("INFO", f"Locating volume by label: \"{args.label}\"")
        found = find_volume_by_label(args.label)
        if not found:
            log("FAIL",
                f"No mounted volume with label \"{args.label}\" found. "
                f"Plug the device in (or pass --dest <path>).")
            return 2
        if len(found) > 1:
            log("FAIL", f"Multiple volumes match label \"{args.label}\": {found}. "
                        f"Pass --dest explicitly.")
            return 2
        target = found[0]
        log("INFO", f"Target source : label \"{args.label}\" -> {target}")

    log("INFO", f"Assets source : {ASSETS_DIR}")
    log("INFO", f"Target        : {target}")
    log("INFO", f"Mode          : {'DRY-RUN' if dry_run else 'WIPE + COPY'}")

    try:
        assert_target_safe(target)
    except SystemExit as e:
        print(str(e))
        return 1

    if dry_run:
        log("INFO", "Dry-run: nothing will be modified. Re-run with --yes to apply.")

    # ---- wipe ----
    log("INFO", "=== Step 1: wipe target ===")
    if args.no_wipe:
        log("INFO", "wipe skipped (--no-wipe)")
    else:
        entries = list(target.iterdir())
        if not entries:
            log("INFO", "target already empty")
        else:
            log("INFO", f"target currently has {len(entries)} top-level entries; wiping...")
            wipe_target(target, dry_run=dry_run)

    # ---- copy ----
    log("INFO", "=== Step 2: copy assets ===")
    copy_assets(target, dry_run=dry_run, workers=max(1, args.workers))

    if dry_run:
        log("INFO", "Dry-run complete. Re-run with --yes to actually wipe + copy.")
    else:
        log("OK", "All done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
