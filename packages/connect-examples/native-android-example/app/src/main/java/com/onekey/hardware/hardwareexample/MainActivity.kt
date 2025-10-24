package com.onekey.hardware.hardwareexample

import android.Manifest
import android.annotation.SuppressLint

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.ParcelUuid
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.core.app.ActivityCompat
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.smallbuer.jsbridge.core.BridgeHandler
import com.smallbuer.jsbridge.core.BridgeWebView
import com.smallbuer.jsbridge.core.CallBackFunction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import no.nordicsemi.android.common.core.DataByteArray
import no.nordicsemi.android.kotlin.ble.client.main.callback.ClientBleGatt
import no.nordicsemi.android.kotlin.ble.client.main.service.ClientBleGattCharacteristic
import no.nordicsemi.android.kotlin.ble.core.scanner.BleScanFilter
import no.nordicsemi.android.kotlin.ble.core.scanner.BleScanMode
import no.nordicsemi.android.kotlin.ble.core.scanner.BleScannerSettings
import no.nordicsemi.android.kotlin.ble.core.scanner.FilteredServiceUuid
import no.nordicsemi.android.kotlin.ble.scanner.BleScanner
import no.nordicsemi.android.kotlin.ble.scanner.aggregator.BleScanResultAggregator
import java.util.UUID
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.app.AlertDialog
import android.view.LayoutInflater
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.widget.TextView
import kotlinx.coroutines.Job
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import no.nordicsemi.android.kotlin.ble.core.ServerDevice
import android.widget.Button
import android.view.View.OnClickListener
import android.os.Handler
import android.os.Looper
import android.widget.EditText
import android.text.InputType
import android.widget.LinearLayout

data class OneKeyDeviceInfo(
    val id: String, val name: String
)

class MainActivity : AppCompatActivity() {
    companion object {
        const val REQUEST_PERMISSION_BLUETOOTH = 1
    }

    lateinit var webview: BridgeWebView

    private var aggregator = BleScanResultAggregator()
    private val bleScanner by lazy { BleScanner(this) }

    private var connection: ClientBleGatt? = null
    private var writeCharacteristic: ClientBleGattCharacteristic? = null
    private var notifyCharacteristic: ClientBleGattCharacteristic? = null

    private var scanDialog: AlertDialog? = null
    private var deviceAdapter: BleDeviceAdapter? = null
    private var selectedDeviceAddress: String? = null

    private var scanJob: Job? = null

    // Removed persistent cache for scanned/selected devices to ensure real-time view
    
    // Device type constants
    private val DEVICE_TYPE_CLASSIC = "classic"
    private val DEVICE_TYPE_TOUCH = "touch"
    private val DEVICE_TYPE_PRO = "pro"
    private val DEVICE_TYPE_UNKNOWN = "unknown"
    
    // Current device type
    private var currentDeviceType = DEVICE_TYPE_UNKNOWN

    // OneKey BLE UUID constants
    private val ONEKEY_SERVICE_UUID_STR = "00000001-0000-1000-8000-00805f9b34fb"
    private val ONEKEY_WRITE_CHAR_UUID_STR = "00000002-0000-1000-8000-00805f9b34fb"
    private val ONEKEY_NOTIFY_CHAR_UUID_STR = "00000003-0000-1000-8000-00805f9b34fb"

    private val ONEKEY_SERVICE_UUID: UUID = UUID.fromString(ONEKEY_SERVICE_UUID_STR)
    private val ONEKEY_WRITE_CHAR_UUID: UUID = UUID.fromString(ONEKEY_WRITE_CHAR_UUID_STR)
    private val ONEKEY_NOTIFY_CHAR_UUID: UUID = UUID.fromString(ONEKEY_NOTIFY_CHAR_UUID_STR)

    // WebUSB whitelist (native side)
    data class UsbVidPid(val vendorId: Int, val productId: Int)
    private val ONEKEY_USB_WHITELIST: Set<UsbVidPid> = setOf(
        UsbVidPid(0x1209, 0x53c0),
        UsbVidPid(0x1209, 0x53c1),
        UsbVidPid(0x1209, 0x4f4a),
        UsbVidPid(0x1209, 0x4f4b),
    )

    // Enumerate USB devices and filter by whitelist (when transport=usb)
    private fun enumerateUsbDevices(overrideFilter: Set<UsbVidPid>? = null): List<OneKeyDeviceInfo> {
        val usbManager = getSystemService(Context.USB_SERVICE) as? UsbManager ?: return emptyList()
        val allow = overrideFilter ?: ONEKEY_USB_WHITELIST
        val results = mutableListOf<OneKeyDeviceInfo>()
        usbManager.deviceList?.values?.forEach { dev: UsbDevice ->
            val vidPid = UsbVidPid(dev.vendorId, dev.productId)
            if (allow.contains(vidPid)) {
                val name = dev.productName ?: dev.deviceName ?: "USB Device"
                // Use system deviceName as id (e.g. "/dev/bus/usb/xxx"), for listing only
                results.add(OneKeyDeviceInfo(id = dev.deviceName, name = name))
            }
        }
        return results
    }



    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webview = findViewById(R.id.webview)
        
        // Do not restore previously selected device; show only real-time scan results
        
        configureWebView()
        loadHtmlFile()
        registerHandlers()

        // Rely on system pairing dialog when bonding is required
    }

    fun registerHandlers() {
        webview.addHandlerLocal("enumerate", object : BridgeHandler() {
            @RequiresApi(Build.VERSION_CODES.S)
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                // Parse optional params: transport (usb/ble), filters ([{vendorId,productId}])
                try {
                    val json = if (!data.isNullOrBlank()) JsonParser.parseString(data).asJsonObject else JsonObject()
                    val transport = if (json.has("transport")) json.get("transport").asString else "ble"
                    if (transport.equals("usb", ignoreCase = true)) {
                        val override: MutableSet<UsbVidPid> = mutableSetOf()
                        if (json.has("filters") && json.get("filters").isJsonArray) {
                            json.getAsJsonArray("filters").forEach { e ->
                                try {
                                    val o = e.asJsonObject
                                    if (o.has("vendorId") && o.has("productId")) {
                                        override.add(UsbVidPid(o.get("vendorId").asInt, o.get("productId").asInt))
                                    }
                                } catch (_: Exception) {}
                            }
                        }
                        val list = enumerateUsbDevices(if (override.isNotEmpty()) override else null)
                        function?.onCallBack(Gson().toJson(list))
                        return
                    }
                } catch (e: Exception) {
                    Log.w("enumerate", "parse params failed, fallback to BLE", e)
                }

                // Default BLE search: run a fresh, local scan session and return results
                lifecycleScope.launch(Dispatchers.Main) {
                    val devices = scanOneKeyDevices(assignToScanJob = false, timeoutMs = 5000, minSeen = 2)
                    val deviceList = devices.map {
                        Log.d("===== service Devices: ", Gson().toJson(it))
                        OneKeyDeviceInfo(id = it.address, name = it.name ?: "")
                    }
                    function?.onCallBack(Gson().toJson(deviceList))
                }
            }
        })

        // Add PIN input handler
        webview.addHandlerLocal("requestPinInput", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                Log.d("PIN Input", "Showing PIN input dialog, device type: $currentDeviceType")
                
                // If device is not Classic1S, return empty to use device input
                if (currentDeviceType != DEVICE_TYPE_CLASSIC){
                    Log.d("PIN Input", "Device is not Classic1S, using device PIN input")
                    function?.onCallBack("")
                    return
                }
                
                // Create a custom PIN input dialog
                val builder = AlertDialog.Builder(this@MainActivity)
                builder.setTitle("PIN Input")
                
                // Define keyboardMap as in the React code
                val keyboardMap = arrayOf("7", "8", "9", "4", "5", "6", "1", "2", "3")
                
                // Inflate the custom layout
                val inflater = LayoutInflater.from(this@MainActivity)
                val view = inflater.inflate(R.layout.dialog_pin_input, null)
                
                // Get button and display references
                val pinDisplay = view.findViewById<TextView>(R.id.pinDisplay)
                val pinButtons = arrayOf(
                    view.findViewById<Button>(R.id.pinButton1),
                    view.findViewById<Button>(R.id.pinButton2),
                    view.findViewById<Button>(R.id.pinButton3),
                    view.findViewById<Button>(R.id.pinButton4),
                    view.findViewById<Button>(R.id.pinButton5),
                    view.findViewById<Button>(R.id.pinButton6),
                    view.findViewById<Button>(R.id.pinButton7),
                    view.findViewById<Button>(R.id.pinButton8),
                    view.findViewById<Button>(R.id.pinButton9)
                )
                val confirmButton = view.findViewById<Button>(R.id.confirmButton)
                val switchToDeviceButton = view.findViewById<Button>(R.id.switchToDeviceButton)
                
                // Store the PIN sequence
                val pinSequence = StringBuilder()
                
                // Set the view to the dialog
                builder.setView(view)
                
                // No need for standard dialog buttons as we have custom ones
                builder.setCancelable(false)
                
                // Create the dialog
                val dialog = builder.create()
                
                // Set up button click listeners
                for (i in pinButtons.indices) {
                    pinButtons[i].setOnClickListener {
                        // Add the mapped number from keyboardMap array based on button index
                        val mappedNumber = keyboardMap[i]
                        pinSequence.append(mappedNumber)
                        
                        // Update the display with dots for each entered digit
                        pinDisplay.text = "•".repeat(pinSequence.length)
                        
                        // Visual feedback for button press
                        it.isPressed = true
                        Handler(Looper.getMainLooper()).postDelayed({ it.isPressed = false }, 200)
                    }
                }
                
                // Set up confirm button
                confirmButton.setOnClickListener {
                    if (pinSequence.isNotEmpty()) {
                        // Return the PIN sequence
                        function?.onCallBack(pinSequence.toString())
                        dialog.dismiss()
                    } else {
                        Toast.makeText(this@MainActivity, "请输入PIN码", Toast.LENGTH_SHORT).show()
                    }
                }
                
                // Set up switch to device button
                switchToDeviceButton.setOnClickListener {
                    // Return empty string to use hardware PIN entry
                    function?.onCallBack("")
                    dialog.dismiss()
                }
                
                // Show dialog on UI thread
                lifecycleScope.launch(Dispatchers.Main) {
                    dialog.show()
                }
            }
        })

        // Add Passphrase input handler
        webview.addHandlerLocal("requestPassphrase", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                Log.d("Passphrase Input", "Showing passphrase input dialog")
                
                // Use AlertDialog to show passphrase input dialog
                val builder = AlertDialog.Builder(this@MainActivity)
                builder.setTitle("输入密码") // Enter passphrase
                
                // Create a custom view for passphrase input
                val inflater = LayoutInflater.from(this@MainActivity)
                val view = LinearLayout(this@MainActivity)
                view.orientation = LinearLayout.VERTICAL
                view.setPadding(50, 50, 50, 50)
                
                // Create passphrase input EditText
                val input = EditText(this@MainActivity)
                input.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                input.hint = "请输入密码" // Enter passphrase
                view.addView(input)
                
                // Set the view to the dialog
                builder.setView(view)
                
                // Add option to use hardware passphrase instead
                builder.setNeutralButton("在设备上输入") { dialog, _ ->
                    dialog.dismiss()
                    function?.onCallBack("")  // Empty string means use hardware passphrase
                }
                
                // Add buttons for submit and cancel
                builder.setPositiveButton("确认") { dialog, _ ->
                    val passphrase = input.text.toString()
                    function?.onCallBack(passphrase)
                    dialog.dismiss()
                }
                
                builder.setNegativeButton("取消") { dialog, _ ->
                    dialog.cancel()
                    function?.onCallBack("")  // If canceled, use hardware passphrase
                }
                
                // Show dialog on UI thread
                lifecycleScope.launch(Dispatchers.Main) {
                    builder.show()
                }
            }
        })

        // Add button confirmation handler
        webview.addHandlerLocal("requestButtonConfirmation", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                Log.d("Button Confirmation", "Showing confirmation dialog")
                
                // Parse message from data if available
                var message = "请在硬件设备上确认此操作" // Please confirm this action on your device
                if (data != null) {
                    try {
                        val jsonObject = JsonParser.parseString(data).asJsonObject
                        if (jsonObject.has("message")) {
                            message = jsonObject.get("message").asString
                        }
                    } catch (e: Exception) {
                        Log.e("Button Confirmation", "Error parsing data", e)
                    }
                }
                
                // Show confirmation dialog
                val builder = AlertDialog.Builder(this@MainActivity)
                builder.setTitle("确认操作") // Confirm Operation
                builder.setMessage(message)
                builder.setPositiveButton("了解") { dialog, _ -> // OK
                    dialog.dismiss()
                    // No callback needed, just dismiss the dialog
                }
                
                // Show dialog on UI thread
                lifecycleScope.launch(Dispatchers.Main) {
                    builder.show()
                }
                
                // Return empty response if function is not null
                function?.onCallBack("")
            }
        })

        // Add close UI window handler
        webview.addHandlerLocal("closeUIWindow", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                Log.d("Close UI", "Received request to close UI windows")
                
                // Here we would dismiss any open dialogs
                // Since we're handling dialogs individually and each has its own dismissal logic,
                // there's not much to do here in this implementation.
                
                // Optionally show a toast message to indicate operation completed
                Toast.makeText(this@MainActivity, "操作已完成", Toast.LENGTH_SHORT).show()
                
                // Return empty response if function is not null
                function?.onCallBack("")
            }
        })

        webview.addHandlerLocal("send", object : BridgeHandler() {
            @SuppressLint("MissingPermission")
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                val jsonObject = JsonParser.parseString(data).asJsonObject

//                val uuid = jsonObject.get("uuid").asString
                val data = jsonObject.get("data").asString

                lifecycleScope.launch(Dispatchers.Default) {
                    Log.d("addHandlerLocal send", data)
                    writeCharacteristic?.write(DataByteArray(HexUtil.fromHex(data)))
                    function?.onCallBack("")
                }
            }
        })

        webview.addHandlerLocal("connect", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                lifecycleScope.launch(Dispatchers.Main) {
                    val macAddress = JsonParser.parseString(data).asJsonObject.get("uuid").asString
                    Log.d("connect", "macAddress: $macAddress")
                    Log.d("connect", "connect")
                    if (connection?.isConnected == true) connection?.discoverServices()
                    connection = ClientBleGatt.connect(this@MainActivity, macAddress, this)
                    val services = connection?.discoverServices()
                    val service = services?.findService(ONEKEY_SERVICE_UUID)

                    writeCharacteristic = service?.findCharacteristic(ONEKEY_WRITE_CHAR_UUID)
                    notifyCharacteristic = service?.findCharacteristic(ONEKEY_NOTIFY_CHAR_UUID)
                    notifyCharacteristic?.getNotifications()?.onEach {
                        Log.d("read notifyCharacteristic", HexUtil.toHex(it.value))
                        withContext(Dispatchers.Main) {
                            webview.callHandler(
                                "monitorCharacteristic",
                                HexUtil.toHex(it.value)
                            ) { value ->
                                Log.d("monitorCharacteristic result", value)
                            }
                        }
                    }?.launchIn(lifecycleScope)
                    function?.onCallBack("")
                }
                Toast.makeText(this@MainActivity, "connect:$data", Toast.LENGTH_SHORT).show()
            }
        })

        webview.addHandlerLocal("disconnect", object : BridgeHandler() {
            override fun handler(context: Context?, data: String?, function: CallBackFunction?) {
                connection?.disconnect()
                Toast.makeText(this@MainActivity, "disconnect:$data", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Connect flow: ensure system pairing (bonding) is used, then connect and setup GATT
    private var bondStateReceiver: BroadcastReceiver? = null
    private fun tryBondAndConnect(macAddress: String) {
        showLoading("Connecting…")
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter
        val device = try { adapter.getRemoteDevice(macAddress) } catch (_: Exception) { null }
        if (device == null) {
            hideLoading()
            Toast.makeText(this, "Invalid device", Toast.LENGTH_SHORT).show()
            return
        }
        val canConnectPerm = ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        val bonded = device.bondState == BluetoothDevice.BOND_BONDED
        if (bonded || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canConnectPerm)) {
            // Already bonded or missing runtime permission for bond APIs: proceed to connect
            connectAndSetup(macAddress)
            return
        }
        // Register bond state receiver for this device only
        bondStateReceiver?.let { unregisterReceiver(it) }
        bondStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action != BluetoothDevice.ACTION_BOND_STATE_CHANGED) return
                val dev: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                if (dev == null || dev.address != device.address) return
                when (intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)) {
                    BluetoothDevice.BOND_BONDED -> {
                        try { unregisterReceiver(this) } catch (_: Exception) {}
                        bondStateReceiver = null
                        connectAndSetup(macAddress)
                    }
                    BluetoothDevice.BOND_NONE -> {
                        try { unregisterReceiver(this) } catch (_: Exception) {}
                        bondStateReceiver = null
                        hideLoading()
                        Toast.makeText(this@MainActivity, "Pairing canceled", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
        registerReceiver(bondStateReceiver, IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED))
        // Trigger system pairing dialog
        val created = device.createBond()
        if (!created) {
            // Fallback: proceed to connect; system may still prompt during connection as needed
            connectAndSetup(macAddress)
        }
    }

    private fun connectAndSetup(macAddress: String) {
        lifecycleScope.launch(Dispatchers.Main) {
            try {
                connection?.discoverServices()
            } catch (_: Exception) {}
            connection = ClientBleGatt.connect(this@MainActivity, macAddress, this)
            val services = connection?.discoverServices()
            val service = services?.findService(ONEKEY_SERVICE_UUID)
            writeCharacteristic = service?.findCharacteristic(ONEKEY_WRITE_CHAR_UUID)
            notifyCharacteristic = service?.findCharacteristic(ONEKEY_NOTIFY_CHAR_UUID)
            notifyCharacteristic?.getNotifications()?.onEach {
                Log.d("read notifyCharacteristic", HexUtil.toHex(it.value))
                withContext(Dispatchers.Main) {
                    webview.callHandler(
                        "monitorCharacteristic",
                        HexUtil.toHex(it.value)
                    ) { value ->
                        Log.d("monitorCharacteristic result", value)
                    }
                }
            }?.launchIn(lifecycleScope)
            hideLoading()
            Toast.makeText(this@MainActivity, "Connected: $macAddress", Toast.LENGTH_SHORT).show()
        }
    }


    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webview.settings.javaScriptEnabled = true  // Enable JavaScript
        webview.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("WebView", consoleMessage?.message() ?: "null")
                return true
            }
        }
    }

    private fun loadHtmlFile() {
        webview.loadUrl("file:///android_asset/index.html")
    }

    // Device MAC address
    var connectId = ""
    val deviceId = ""

    fun getFeatures(view: View) {
        showLoading()
        val dataJson = JsonObject().apply {
            addProperty("connectId", connectId)
        }
        val json = JsonObject().apply {
            addProperty("name", "getFeatures")
            add("data", dataJson)
        }
        try {
            webview.callHandler("bridgeCommonCall", json.toString()) { value ->
                hideLoading()
                Log.d("getFeatures result", value)
                updateResultText("Features: $value")
            }
        } catch (e: Exception) {
            hideLoading()
            updateResultText("getFeatures error: ${e.message}")
        }
    }

    fun btcGetAddress(view: View) {
        showLoading()
        val dataJson = JsonObject().apply {
            addProperty("connectId", connectId)
            addProperty("deviceId", deviceId)
            addProperty("path", "m/44'/0'/0'/0/0")
            addProperty("coin", "btc")
            addProperty("showOnOneKey", false)
            addProperty("useEmptyPassphrase", true)
        }

        val json = JsonObject().apply {
            addProperty("name", "btcGetAddress")
            add("data", dataJson)
        }

        try {
            webview.callHandler("bridgeCommonCall", json.toString()) { value ->
                hideLoading()
                Log.d("btcGetAddress result", value)
                updateResultText("BTC Address: $value")
            }
        } catch (e: Exception) {
            hideLoading()
            updateResultText("btcGetAddress error: ${e.message}")
        }
    }

    fun evmGetAddress(view: View) {
        showLoading()
        val dataJson = JsonObject().apply {
            addProperty("connectId", connectId)
            addProperty("deviceId", deviceId)
            addProperty("path", "m/44'/60'/0'/0/0")
            addProperty("chainId", 1)
            addProperty("showOnOneKey", true)
            addProperty("useEmptyPassphrase", true)
        }
        val json = JsonObject().apply {
            addProperty("name", "evmGetAddress")
            add("data", dataJson)
        }
        try {
            webview.callHandler("bridgeCommonCall", json.toString()) { value ->
                hideLoading()
                Log.d("evmGetAddress result", value)
                updateResultText("EVM Address: $value")
            }
        } catch (e: Exception) {
            hideLoading()
            updateResultText("evmGetAddress error: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    fun getConnectedDevices(view: View) {
        Log.d("getConnectedDevices", "getConnectedDevices")
        // if (ActivityCompat.checkSelfPermission(
        //         this,
        //         Manifest.permission.BLUETOOTH_CONNECT
        //     ) != PackageManager.PERMISSION_GRANTED
        // ) {
        //     ActivityCompat.requestPermissions(
        //         this,
        //         arrayOf(Manifest.permission.BLUETOOTH_CONNECT),
        //         REQUEST_PERMISSION_BLUETOOTH
        //     )
        //     return
        // }

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val bluetoothAdapter = bluetoothManager.adapter

        // Check if Bluetooth is enabled
        if (!bluetoothAdapter.isEnabled) {
            Toast.makeText(this, "请先开启蓝牙", Toast.LENGTH_SHORT).show()
            return
        }

        // Get bonded devices
        val pairedDevices = bluetoothAdapter.bondedDevices
        
        if (pairedDevices.isEmpty()) {
            Toast.makeText(this, "没有已配对的设备", Toast.LENGTH_SHORT).show()
            return
        }

        // Iterate and display bonded devices
        pairedDevices.forEach { device ->
            Log.d("Paired Device", "Name: ${device.name}, MAC: ${device.address}")
            Toast.makeText(
                this,
                "配对设备: ${device.name}, MAC: ${device.address}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    fun checkFirmwareRelease(view: View) {
        showLoading()
        val dataJson = JsonObject().apply {
            addProperty("connectId", connectId)
            addProperty("deviceId", deviceId)
        }
        val json = JsonObject().apply {
            addProperty("name", "checkFirmwareRelease")
            add("data", dataJson)
        }
        try {
            webview.callHandler("bridgeCommonCall", json.toString()) { value ->
                hideLoading()
                Log.d("checkFirmwareRelease result", value)
                updateResultText("Firmware Release: $value")    
            }
        } catch (e: Exception) {
            hideLoading()
            updateResultText("checkFirmwareRelease error: ${e.message}")
        }
    }

    fun checkBleFirmwareRelease(view: View) {
        showLoading()
        val dataJson = JsonObject().apply {
            addProperty("connectId", connectId)
            addProperty("deviceId", deviceId)
        }
        val json = JsonObject().apply {
            addProperty("name", "checkBLEFirmwareRelease")
            add("data", dataJson)
        }
        try {
            webview.callHandler("bridgeCommonCall", json.toString()) { value ->
                hideLoading()
                Log.d("checkBleFirmwareRelease result", value)
                updateResultText("BLE Firmware Release: $value")
            }
        } catch (e: Exception) {
            hideLoading()
            updateResultText("checkBleFirmwareRelease error: ${e.message}")
        }
    }

    private fun checkBluetoothEnabled(): Boolean {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val bluetoothAdapter = bluetoothManager.adapter

        if (!bluetoothAdapter.isEnabled) {
            Toast.makeText(this, "Please enable Bluetooth", Toast.LENGTH_SHORT).show()
            return false
        }
        return true
    }

    private fun checkBluetoothPermissions(): Boolean {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        val missingPermissions = permissions.filter {
            ActivityCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missingPermissions.toTypedArray(),
                REQUEST_PERMISSION_BLUETOOTH
            )
            return false
        }
        return true
    }

    @RequiresApi(Build.VERSION_CODES.S)
    fun showScanDialog(view: View) {
        showLoading()
        scanJob?.cancel()
        
        if (!checkBluetoothPermissions() || !checkBluetoothEnabled()) {
            hideLoading()
            return
        }

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_ble_devices, null)
        val recyclerView = dialogView.findViewById<RecyclerView>(R.id.deviceList)
        val scanStatus = dialogView.findViewById<TextView>(R.id.scanStatus)
        
        recyclerView.layoutManager = LinearLayoutManager(this)
        val scannedDevices = mutableListOf<ServerDevice>()
        
        deviceAdapter = BleDeviceAdapter { address ->
            selectedDeviceAddress = address
            connectId = address
            
            // Initialize as unknown type; will update from API response later
            currentDeviceType = DEVICE_TYPE_UNKNOWN
            
            Toast.makeText(this, "Selected device: $address", Toast.LENGTH_SHORT).show()
            scanDialog?.dismiss()
            scanJob?.cancel()
            updateConnectionStatus()
            tryBondAndConnect(address)
        }
        recyclerView.adapter = deviceAdapter
        recyclerView.visibility = View.GONE // Initially hidden

        scanDialog = AlertDialog.Builder(this)
            .setTitle("Scan BLE Devices")
            .setView(dialogView)
            .setNegativeButton("Cancel") { dialog, _ -> 
                scanJob?.cancel()
                dialog.dismiss() 
            }
            .create()

        scanDialog?.show()
        hideLoading()

        scanDialog?.setOnDismissListener {
            // Ensure scanning stops when dialog is dismissed in any way
            scanJob?.cancel()
        }

        lifecycleScope.launch {
            scanStatus.text = "Scanning..."

            val devices = scanOneKeyDevices(assignToScanJob = true, timeoutMs = 5000, minSeen = 2)

            withContext(Dispatchers.Main) {
                recyclerView.visibility = View.VISIBLE
                deviceAdapter?.updateDevices(devices)
                scanStatus.text = if (devices.isEmpty()) {
                    "No devices found"
                } else {
                    "Found ${devices.size} devices"
                }
            }
        }
    }

    private fun updateConnectionStatus() {
        val statusText = findViewById<TextView>(R.id.connectionStatus)
        statusText.text = if (selectedDeviceAddress != null) {
            "Selected device: $selectedDeviceAddress"
        } else {
            "No device selected"
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scanJob?.cancel()
        scanDialog?.dismiss()
        loadingDialog?.dismiss()
        // No extra receiver to unregister for system pairing
    }

    // System pairing is handled via device.createBond() which triggers system PIN UI.

    override fun onPause() {
        super.onPause()
        scanJob?.cancel()
    }

    private fun updateResultText(result: String) {
        val resultText = findViewById<TextView>(R.id.resultText)
        resultText.text = result
    }

    // Global loading to prevent repeated clicks
    private var loadingDialog: AlertDialog? = null
    private fun showLoading(message: String = "Please wait…") {
        if (loadingDialog?.isShowing == true) return
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(50, 40, 50, 40)
            val progress = android.widget.ProgressBar(this@MainActivity).apply { isIndeterminate = true }
            val tv = TextView(this@MainActivity).apply { text = message; setPadding(30, 0, 0, 0) }
            addView(progress)
            addView(tv)
        }
        loadingDialog = AlertDialog.Builder(this)
            .setView(container)
            .setCancelable(false)
            .create()
        loadingDialog?.show()
    }
    private fun hideLoading() {
        loadingDialog?.dismiss()
        loadingDialog = null
    }

    // Unified BLE scan: returns current OneKey devices seen at least 'minSeen' times within 'timeoutMs'.
    private suspend fun scanOneKeyDevices(assignToScanJob: Boolean = false, timeoutMs: Long = 5000L, minSeen: Int = 2): List<ServerDevice> {
        // Start a fresh scan session with a new aggregator and per-session counters
        val sessionAggregator = BleScanResultAggregator()
        val seenCounts = mutableMapOf<String, Int>()
        val latest = LinkedHashMap<String, ServerDevice>()

        val sessionJob = bleScanner.scan(
            filters = listOf(
                BleScanFilter(
                    serviceUuid = FilteredServiceUuid(ParcelUuid.fromString(ONEKEY_SERVICE_UUID_STR))
                )
            ),
            settings = BleScannerSettings(scanMode = BleScanMode.SCAN_MODE_LOW_LATENCY)
        ).onEach { data ->
            val results = sessionAggregator.aggregateDevices(data)
            results.forEach { dev ->
                val addr = dev.address
                seenCounts[addr] = (seenCounts[addr] ?: 0) + 1
                latest[addr] = dev
            }
        }.launchIn(lifecycleScope)

        if (assignToScanJob) {
            scanJob?.cancel()
            scanJob = sessionJob
        }

        withContext(Dispatchers.Default) { delay(timeoutMs) }
        sessionJob.cancel()

        return latest.values.filter { (seenCounts[it.address] ?: 0) >= minSeen }
    }
}
