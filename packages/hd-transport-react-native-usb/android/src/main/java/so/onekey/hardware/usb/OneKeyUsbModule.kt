package so.onekey.hardware.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.SystemClock
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Keep vendor/product IDs in sync with ONEKEY_WEBUSB_FILTER
 * in packages/shared/src/constants.ts.
 */
private data class UsbId(val vendorId: Int, val productId: Int)

private val ONEKEY_USB_FILTER = listOf(
    UsbId(0x1209, 0x53c0),
    UsbId(0x1209, 0x53c1),
    UsbId(0x1209, 0x4f4a),
    UsbId(0x1209, 0x4f4b),
    UsbId(0x1209, 0x4f4c),
)

private const val ACTION_USB_PERMISSION = "so.onekey.hardware.usb.USB_PERMISSION"
private const val EXTRA_DEVICE_HANDLE = "so.onekey.hardware.usb.EXTRA_DEVICE_HANDLE"
private const val EVENT_ATTACHED = "OneKeyUsbDeviceAttached"
private const val EVENT_DETACHED = "OneKeyUsbDeviceDetached"
private const val INTERFACE_NUMBER = 0
private const val MAX_TRANSFER_IN_LENGTH = 16384
private const val CLOSE_TIMEOUT_MS = 2000L
private const val CLOSE_AWAIT_TIMEOUT_MS = 2500L
private const val TIMEOUT_TOLERANCE_MS = 250L

private class OpenConnection(
    val device: UsbDevice,
    val connection: UsbDeviceConnection,
    val usbInterface: UsbInterface,
    val endpointIn: UsbEndpoint,
    val endpointOut: UsbEndpoint,
    val executor: ExecutorService,
    val cancelled: AtomicBoolean = AtomicBoolean(false),
    val closed: AtomicBoolean = AtomicBoolean(false),
    val cancelSeq: AtomicInteger = AtomicInteger(0),
)

/**
 * React Native Android USB Host transport module.
 *
 * Device connection close policy:
 * - Close a device connection ONLY when:
 *   1. USB detach of that device (`ACTION_USB_DEVICE_DETACHED`),
 *   2. Explicit `close(handle)` call from JS,
 *   3. SDK / transport dispose (`stop()`),
 *   4. Native module `invalidate()`,
 *   5. Process death.
 * - Do NOT close connections on Activity pause / app background, whether or not
 *   `priorityMode` is enabled. The USB link must survive backgrounding (including
 *   during firmware updates).
 * - `setPriorityMode(enabled)` is a JS transport-preference lock (preventing fallback
 *   to BLE on temporary detach during reboot/bootloader re-enumeration) plus a native
 *   flag stored for forward compatibility; it is NOT what keeps the fd open in the
 *   background (that is the default).
 */
class OneKeyUsbModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val usbManager: UsbManager =
        reactContext.getSystemService(Context.USB_SERVICE) as UsbManager

    // Keyed by native handle (UsbDevice.deviceName), which is stable for one plug session.
    private val openConnections = ConcurrentHashMap<String, OpenConnection>()
    private val lifecycleLock = Any()
    private val closingLocks = ConcurrentHashMap<String, CountDownLatch>()
    private val closeExecutor: ExecutorService = Executors.newCachedThreadPool()
    private val permissionLock = Any()
    private val permissionPromises = mutableMapOf<String, MutableList<Promise>>()
    private val permissionRequestCode = AtomicInteger(1)
    private val priorityMode = AtomicBoolean(false)

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    val device: UsbDevice? = extraDevice(intent)
                    val handle = device?.deviceName ?: intent.getStringExtra(EXTRA_DEVICE_HANDLE)
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    val promises: List<Promise> = synchronized(permissionLock) {
                        if (handle != null) {
                            permissionPromises.remove(handle)?.toList() ?: emptyList()
                        } else if (permissionPromises.size == 1) {
                            // If both EXTRA_DEVICE and EXTRA_DEVICE_HANDLE are missing and only one
                            // device has a pending request, resolve false rather than guessing.
                            val onlyKey = permissionPromises.keys.first()
                            permissionPromises.remove(onlyKey)?.toList() ?: emptyList()
                        } else {
                            emptyList()
                        }
                    }
                    val result = if (handle != null) granted else false
                    promises.forEach { it.resolve(result) }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    extraDevice(intent)?.let { device ->
                        if (isOneKeyDevice(device)) {
                            emit(EVENT_ATTACHED, deviceToMap(device))
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    extraDevice(intent)?.let { device ->
                        if (isOneKeyDevice(device)) {
                            val handle = device.deviceName
                            val pending = synchronized(permissionLock) {
                                permissionPromises.remove(handle)?.toList() ?: emptyList()
                            }
                            pending.forEach { it.resolve(false) }
                            closeDeviceInternal(handle)
                            emit(EVENT_DETACHED, deviceToMap(device))
                        }
                    }
                }
            }
        }
    }

    override fun getName(): String = "OneKeyUsb"

    override fun initialize() {
        super.initialize()
        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        ContextCompat.registerReceiver(
            reactContext,
            usbReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun invalidate() {
        priorityMode.set(false)
        openConnections.keys.toList().forEach { closeDeviceInternal(it) }
        closeExecutor.shutdown()
        val pending = synchronized(permissionLock) {
            val all = permissionPromises.values.flatten()
            permissionPromises.clear()
            all
        }
        pending.forEach { it.resolve(false) }
        try {
            reactContext.unregisterReceiver(usbReceiver)
        } catch (_: Exception) {
        }
        super.invalidate()
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        // Required for NativeEventEmitter on RN.
    }

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {
        // Required for NativeEventEmitter on RN.
    }

    @ReactMethod
    fun setPriorityMode(enabled: Boolean, promise: Promise) {
        priorityMode.set(enabled)
        promise.resolve(null)
    }

    @ReactMethod
    fun getDevices(promise: Promise) {
        try {
            val result = Arguments.createArray()
            usbManager.deviceList.values
                .filter { isOneKeyDevice(it) }
                .forEach { result.pushMap(deviceToMap(it)) }
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("USB_ENUMERATE_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun hasPermission(handle: String, promise: Promise) {
        val device = findDevice(handle)
        if (device == null) {
            promise.reject("USB_NOT_FOUND", "USB device not found")
            return
        }
        promise.resolve(usbManager.hasPermission(device))
    }

    @ReactMethod
    fun requestPermission(handle: String, promise: Promise) {
        val device = findDevice(handle)
        if (device == null) {
            promise.reject("USB_NOT_FOUND", "USB device not found")
            return
        }
        if (usbManager.hasPermission(device)) {
            promise.resolve(true)
            return
        }
        val key = device.deviceName
        val shouldRequest = synchronized(permissionLock) {
            val list = permissionPromises.getOrPut(key) { mutableListOf() }
            val isFirst = list.isEmpty()
            list.add(promise)
            isFirst
        }
        if (!shouldRequest) {
            return
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val intent = Intent(ACTION_USB_PERMISSION)
            .setPackage(reactContext.packageName)
            .putExtra(EXTRA_DEVICE_HANDLE, key)
        val pending = PendingIntent.getBroadcast(
            reactContext,
            permissionRequestCode.getAndIncrement(),
            intent,
            flags,
        )
        usbManager.requestPermission(device, pending)
    }

    @ReactMethod
    fun open(handle: String, promise: Promise) {
        val closingLatch = synchronized(lifecycleLock) {
            if (openConnections.containsKey(handle)) {
                promise.resolve(null)
                return
            }
            closingLocks[handle]
        }
        if (closingLatch != null) {
            try {
                closeExecutor.execute {
                    val finished = try {
                        closingLatch.await(CLOSE_AWAIT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                        false
                    }
                    val stillClosing = synchronized(lifecycleLock) {
                        closingLocks.containsKey(handle)
                    }
                    if (!finished || stillClosing) {
                        promise.reject("USB_OPEN_FAILED", "USB device close in progress")
                        return@execute
                    }
                    openInternal(handle, promise)
                }
            } catch (_: RejectedExecutionException) {
                promise.reject("USB_OPEN_FAILED", "USB module invalidated")
            }
            return
        }
        openInternal(handle, promise)
    }

    private fun openInternal(handle: String, promise: Promise) {
        val device = findDevice(handle)
        if (device == null) {
            promise.reject("USB_NOT_FOUND", "USB device not found")
            return
        }
        if (!usbManager.hasPermission(device)) {
            promise.reject("USB_PERMISSION", "USB permission denied")
            return
        }
        val key = device.deviceName
        synchronized(lifecycleLock) {
            if (openConnections.containsKey(key)) {
                promise.resolve(null)
                return
            }
            if (closingLocks.containsKey(key)) {
                promise.reject("USB_OPEN_FAILED", "USB device close in progress")
                return
            }
        }
        var connection: UsbDeviceConnection? = null
        var executor: ExecutorService? = null
        try {
            connection = usbManager.openDevice(device)
                ?: throw IllegalStateException("openDevice returned null")
            val usbInterface = selectInterface(device)
            if (!connection.claimInterface(usbInterface, true)) {
                throw IllegalStateException("claimInterface failed")
            }
            val endpointIn = findEndpoint(usbInterface, UsbConstants.USB_DIR_IN)
                ?: throw IllegalStateException("USB IN endpoint not found")
            val endpointOut = findEndpoint(usbInterface, UsbConstants.USB_DIR_OUT)
                ?: throw IllegalStateException("USB OUT endpoint not found")
            executor = Executors.newSingleThreadExecutor()
            val open = OpenConnection(
                device = device,
                connection = connection,
                usbInterface = usbInterface,
                endpointIn = endpointIn,
                endpointOut = endpointOut,
                executor = executor,
            )
            val inserted = synchronized(lifecycleLock) {
                if (closingLocks.containsKey(key)) {
                    false
                } else if (openConnections.containsKey(key)) {
                    true
                } else {
                    openConnections[key] = open
                    true
                }
            }
            if (!inserted) {
                throw IllegalStateException("USB device close in progress")
            }
            if (openConnections[key] !== open) {
                executor.shutdown()
                try {
                    connection.releaseInterface(usbInterface)
                } catch (_: Exception) {
                }
                try {
                    connection.close()
                } catch (_: Exception) {
                }
            }
            promise.resolve(null)
        } catch (error: Exception) {
            executor?.shutdown()
            try {
                connection?.close()
            } catch (_: Exception) {
            }
            promise.reject("USB_OPEN_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun close(handle: String, promise: Promise) {
        closeDeviceInternal(handle) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun transferOut(handle: String, data: String, timeoutMs: Int, promise: Promise) {
        val open = openConnections[handle]
        if (open == null || open.closed.get()) {
            promise.reject("USB_NOT_FOUND", "USB device is not open")
            return
        }
        try {
            open.executor.execute {
                try {
                    if (open.closed.get() || open.cancelled.get()) {
                        promise.reject("USB_CANCELLED", "USB transfer cancelled")
                        return@execute
                    }
                    val bytes = Base64.decode(data, Base64.DEFAULT)
                    var offset = 0
                    val startMs = SystemClock.elapsedRealtime()
                    while (offset < bytes.size) {
                        if (open.closed.get() || open.cancelled.get()) {
                            promise.reject("USB_CANCELLED", "USB transfer cancelled")
                            return@execute
                        }
                        val remainingTimeoutMs = if (timeoutMs > 0) {
                            val elapsed = SystemClock.elapsedRealtime() - startMs
                            val left = timeoutMs - elapsed
                            if (left <= 0) {
                                rejectBulkTransferFailure(open, elapsed, timeoutMs, promise)
                                return@execute
                            }
                            left.toInt()
                        } else {
                            timeoutMs
                        }
                        val transferStartMs = SystemClock.elapsedRealtime()
                        val written = open.connection.bulkTransfer(
                            open.endpointOut,
                            bytes,
                            offset,
                            bytes.size - offset,
                            remainingTimeoutMs,
                        )
                        if (written < 0) {
                            val elapsed = SystemClock.elapsedRealtime() - transferStartMs
                            rejectBulkTransferFailure(open, elapsed, remainingTimeoutMs, promise)
                            return@execute
                        }
                        if (written == 0) {
                            val elapsed = SystemClock.elapsedRealtime() - startMs
                            rejectBulkTransferFailure(open, elapsed, timeoutMs, promise)
                            return@execute
                        }
                        if (open.closed.get() || open.cancelled.get()) {
                            promise.reject("USB_CANCELLED", "USB transfer cancelled")
                            return@execute
                        }
                        offset += written
                    }
                    promise.resolve(null)
                } catch (error: Exception) {
                    promise.reject("USB_TRANSFER_OUT", error.message, error)
                }
            }
        } catch (_: RejectedExecutionException) {
            promise.reject("USB_CANCELLED", "USB transfer cancelled")
        }
    }

    @ReactMethod
    fun transferIn(handle: String, length: Int, timeoutMs: Int, promise: Promise) {
        if (length <= 0) {
            promise.reject("USB_TRANSFER_IN", "Invalid USB transfer length: $length")
            return
        }
        val open = openConnections[handle]
        if (open == null || open.closed.get()) {
            promise.reject("USB_NOT_FOUND", "USB device is not open")
            return
        }
        try {
            open.executor.execute {
                try {
                    if (open.closed.get() || open.cancelled.get()) {
                        promise.reject("USB_CANCELLED", "USB transfer cancelled")
                        return@execute
                    }
                    val readLength = minOf(length, MAX_TRANSFER_IN_LENGTH)
                    val buffer = ByteArray(readLength)
                    val startMs = SystemClock.elapsedRealtime()
                    val read = open.connection.bulkTransfer(
                        open.endpointIn,
                        buffer,
                        readLength,
                        timeoutMs,
                    )
                    if (read < 0) {
                        val elapsed = SystemClock.elapsedRealtime() - startMs
                        rejectBulkTransferFailure(open, elapsed, timeoutMs, promise)
                        return@execute
                    }
                    if (open.closed.get() || open.cancelled.get()) {
                        promise.reject("USB_CANCELLED", "USB transfer cancelled")
                        return@execute
                    }
                    if (read == 0) {
                        promise.reject("USB_TRANSFER_IN", "Empty USB transfer")
                        return@execute
                    }
                    val encoded = Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)
                    promise.resolve(encoded)
                } catch (error: Exception) {
                    promise.reject("USB_TRANSFER_IN", error.message, error)
                }
            }
        } catch (_: RejectedExecutionException) {
            promise.reject("USB_CANCELLED", "USB transfer cancelled")
        }
    }

    @ReactMethod
    fun cancel(handle: String, promise: Promise) {
        val open = openConnections[handle]
        if (open != null && !open.closed.get()) {
            val seq = open.cancelSeq.incrementAndGet()
            open.cancelled.set(true)
            try {
                open.executor.execute {
                    // One-shot cancel: reject transfers queued before this sentinel, then clear
                    // the flag so subsequent transfers on the same open handle succeed.
                    if (!open.closed.get() && open.cancelSeq.get() == seq) {
                        open.cancelled.set(false)
                    }
                }
            } catch (_: RejectedExecutionException) {
                // Connection closed before sentinel could be scheduled.
            }
        }
        promise.resolve(null)
    }

    private fun isTransferTimeout(elapsedMs: Long, timeoutMs: Int): Boolean {
        if (timeoutMs <= 0) {
            return false
        }
        // Android bulkTransfer can return -1 slightly before timeoutMs expires; require at least
        // 90% of timeoutMs as well so small timeouts (e.g. 50ms drain) do not mask real I/O errors.
        val minElapsedMs = maxOf(
            0L,
            maxOf(
                timeoutMs.toLong() - TIMEOUT_TOLERANCE_MS,
                (timeoutMs.toLong() * 9L) / 10L,
            ),
        )
        return elapsedMs >= minElapsedMs
    }

    private fun rejectBulkTransferFailure(
        open: OpenConnection,
        elapsedMs: Long,
        timeoutMs: Int,
        promise: Promise,
    ) {
        if (!isDeviceConnected(open.device.deviceName)) {
            promise.reject("USB_NOT_FOUND", "USB device disconnected")
        } else if (open.closed.get() || open.cancelled.get()) {
            promise.reject("USB_CANCELLED", "USB transfer cancelled")
        } else if (isTransferTimeout(elapsedMs, timeoutMs)) {
            promise.reject("USB_TIMEOUT", "USB transfer timeout")
        } else {
            promise.reject("USB_TRANSFER_FAILED", "USB transfer failed")
        }
    }

    private fun isDeviceConnected(handle: String): Boolean {
        return usbManager.deviceList.values.any { it.deviceName == handle }
    }

    private fun closeDeviceInternal(handle: String, onComplete: (() -> Unit)? = null) {
        val latch = CountDownLatch(1)
        val open: OpenConnection?
        val previousLatch: CountDownLatch?
        synchronized(lifecycleLock) {
            open = openConnections.remove(handle)
            if (open != null) {
                open.closed.set(true)
                open.cancelled.set(true)
                previousLatch = closingLocks.put(handle, latch)
            } else {
                previousLatch = closingLocks[handle]
            }
        }

        if (open == null) {
            if (previousLatch == null) {
                onComplete?.invoke()
                return
            }
            try {
                closeExecutor.execute {
                    try {
                        previousLatch.await(CLOSE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                    } finally {
                        onComplete?.invoke()
                    }
                }
            } catch (_: RejectedExecutionException) {
                onComplete?.invoke()
            }
            return
        }

        val closeTask = Runnable {
            try {
                if (previousLatch != null) {
                    try {
                        previousLatch.await(CLOSE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                    }
                }
                try {
                    open.connection.releaseInterface(open.usbInterface)
                } catch (_: Exception) {
                }
                try {
                    // UsbDeviceConnection.close() unblocks any pending bulkTransfer on open.executor.
                    open.connection.close()
                } catch (_: Exception) {
                }
                open.executor.shutdown()
                try {
                    if (!open.executor.awaitTermination(CLOSE_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
                        open.executor.shutdownNow()
                    }
                } catch (_: InterruptedException) {
                    open.executor.shutdownNow()
                    Thread.currentThread().interrupt()
                }
            } finally {
                synchronized(lifecycleLock) {
                    if (closingLocks[handle] === latch) {
                        closingLocks.remove(handle)
                    }
                }
                latch.countDown()
                onComplete?.invoke()
            }
        }

        try {
            closeExecutor.execute(closeTask)
        } catch (_: RejectedExecutionException) {
            closeTask.run()
        }
    }

    private fun findDevice(handle: String): UsbDevice? {
        return usbManager.deviceList.values.firstOrNull { device ->
            isOneKeyDevice(device) && device.deviceName == handle
        }
    }

    private fun isOneKeyDevice(device: UsbDevice): Boolean {
        return ONEKEY_USB_FILTER.any {
            it.vendorId == device.vendorId && it.productId == device.productId
        }
    }

    private fun selectInterface(device: UsbDevice): UsbInterface {
        var primary: UsbInterface? = null
        var vendorFallback: UsbInterface? = null
        for (index in 0 until device.interfaceCount) {
            val iface = device.getInterface(index)
            if (!hasSupportedEndpoints(iface)) {
                continue
            }
            if (iface.id == INTERFACE_NUMBER && primary == null) {
                primary = iface
            }
            if (iface.interfaceClass == UsbConstants.USB_CLASS_VENDOR_SPEC && vendorFallback == null) {
                vendorFallback = iface
            }
        }
        return primary ?: vendorFallback
            ?: throw IllegalStateException(
                "No suitable OneKey USB interface found (need interface id $INTERFACE_NUMBER or vendor-specific 0xFF with IN/OUT bulk or interrupt endpoints)"
            )
    }

    private fun hasSupportedEndpoints(usbInterface: UsbInterface): Boolean {
        return findEndpoint(usbInterface, UsbConstants.USB_DIR_IN) != null &&
            findEndpoint(usbInterface, UsbConstants.USB_DIR_OUT) != null
    }

    private fun findEndpoint(usbInterface: UsbInterface, direction: Int): UsbEndpoint? {
        var interruptFallback: UsbEndpoint? = null
        for (index in 0 until usbInterface.endpointCount) {
            val endpoint = usbInterface.getEndpoint(index)
            if (endpoint.direction != direction) {
                continue
            }
            if (endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                return endpoint
            }
            if (endpoint.type == UsbConstants.USB_ENDPOINT_XFER_INT && interruptFallback == null) {
                interruptFallback = endpoint
            }
        }
        return interruptFallback
    }

    private fun deviceToMap(device: UsbDevice): WritableMap {
        val map = Arguments.createMap()
        val hasPermission = usbManager.hasPermission(device)
        map.putString("handle", device.deviceName)
        map.putInt("vendorId", device.vendorId)
        map.putInt("productId", device.productId)
        val productName = device.productName
        if (productName.isNullOrBlank()) {
            map.putNull("productName")
        } else {
            map.putString("productName", productName)
        }
        val manufacturerName = device.manufacturerName
        if (manufacturerName.isNullOrBlank()) {
            map.putNull("manufacturerName")
        } else {
            map.putString("manufacturerName", manufacturerName)
        }
        val serial = try {
            if (hasPermission) device.serialNumber else null
        } catch (_: SecurityException) {
            null
        }
        if (serial.isNullOrBlank()) {
            map.putNull("serialNumber")
        } else {
            map.putString("serialNumber", serial)
        }
        map.putBoolean("hasPermission", hasPermission)
        return map
    }

    private fun extraDevice(intent: Intent): UsbDevice? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }
    }

    private fun emit(event: String, payload: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }
}
