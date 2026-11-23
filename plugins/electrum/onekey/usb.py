"""USB transport for Pro 2 and Neo, using host Python/native libusb.

The native library is loaded from the host, never from a member of the plugin zip.
Enumeration follows firmware-pro2: vendor 0x1209, the 0x4Fxx ids first, then 0x53xx,
and the vendor-class interface 0xFF.
"""

from .frame import RX_BUFFER_SIZE
from .link import Link, LinkError


USB_VID = 0x1209
USB_PIDS_PREFERRED = (0x4F4A, 0x4F4B, 0x4F4C)
USB_PIDS_FALLBACK = (0x53C0, 0x53C1)
USB_PIDS = USB_PIDS_PREFERRED + USB_PIDS_FALLBACK
USB_CLASS_VENDOR = 0xFF

_usb_context = None


def _usb1():
    try:
        import usb1
    except Exception:
        raise LinkError("USB_UNAVAILABLE") from None
    return usb1


def check_available():
    try:
        context = _usb1().USBContext()
        context.open()
        context.close()
    except Exception:
        raise ImportError("OneKey requires python-libusb1 and native libusb") from None


def _context():
    global _usb_context
    if _usb_context is None:
        usb1 = _usb1()
        _usb_context = usb1.USBContext()
        _usb_context.open()
    return _usb_context


def _endpoints(device, usb1):
    bulk = usb1.libusb1.LIBUSB_TRANSFER_TYPE_BULK
    incoming = usb1.libusb1.LIBUSB_ENDPOINT_IN
    try:
        config = device[0]
    except Exception:
        return None
    for interface_index in range(config.getNumInterfaces()):
        setting = config[interface_index][0]
        if setting.getClass() != USB_CLASS_VENDOR:
            continue
        ep_in = ep_out = None
        for endpoint in setting:
            if endpoint.getAttributes() & 0x03 != bulk:
                continue
            address = endpoint.getAddress()
            if address & incoming:
                ep_in = address
            else:
                ep_out = address
        if ep_in is not None and ep_out is not None:
            return setting.getNumber(), ep_in, ep_out
    return None


def _path(device):
    ports = ".".join(str(port) for port in device.getPortNumberList())
    return f"{device.getBusNumber():03d}:{ports}"


def list_paths():
    usb1 = _usb1()
    preferred = []
    fallback = []
    for device in _context().getDeviceIterator(skip_on_error=True):
        if device.getVendorID() != USB_VID or device.getProductID() not in USB_PIDS:
            continue
        if _endpoints(device, usb1) is None:
            continue
        bucket = preferred if device.getProductID() in USB_PIDS_PREFERRED else fallback
        bucket.append(_path(device))
    return preferred + fallback


def open_path(path):
    usb1 = _usb1()
    for device in _context().getDeviceIterator(skip_on_error=True):
        if _path(device) != path:
            continue
        ends = _endpoints(device, usb1)
        if ends is None:
            break
        number, ep_in, ep_out = ends
        try:
            handle = device.open()
        except Exception:
            raise LinkError("USB_UNAVAILABLE") from None
        try:
            if handle.kernelDriverActive(number):
                handle.detachKernelDriver(number)
        except Exception:
            pass
        try:
            handle.claimInterface(number)
        except Exception:
            handle.close()
            raise LinkError("USB_UNAVAILABLE") from None

        def read(size, timeout_ms, handle=handle, ep_in=ep_in):
            try:
                return bytes(handle.bulkRead(ep_in, size, timeout_ms))
            except usb1.USBErrorTimeout as error:
                received = getattr(error, "received", None)
                return bytes(received) if received else b""
            except Exception:
                raise LinkError("SDK_FAILED") from None

        def write(data, handle=handle, ep_out=ep_out):
            try:
                written = handle.bulkWrite(ep_out, data, 1000)
            except Exception:
                raise LinkError("SDK_FAILED") from None
            if written != len(data):
                raise LinkError("SDK_FAILED")

        def close(handle=handle, number=number):
            try:
                handle.releaseInterface(number)
            finally:
                handle.close()

        try:
            # Reclaim does not flush a device endpoint. Discard the old claim's
            # replies before issuing the new, response-validated V2 probe.
            for _ in range(20):
                if not read(RX_BUFFER_SIZE, 50):
                    break
            else:
                raise LinkError("PROTOCOL")
        except BaseException:
            close()
            raise
        return Link(read, write, close)
    raise LinkError("SDK_FAILED")
