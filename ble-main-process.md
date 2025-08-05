[2] 14:43:09.831 › set isAppReady on browserWindow dom-ready true
[2] 14:43:09.880 › browserWindow >>>> did-finish-load
[2] [24636:0805/144309.902228:ERROR:CONSOLE(1)] "Request Fetch.enable failed. {"code":-32601,"message":"'Fetch.enable' wasn't found"}", source: devtools://devtools/bundled/core/protocol_client/protocol_client.js (1)
[2] 14:43:10.468 › auto-updater builderNumber:
[2] (node:24643) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 appState listeners added to [IpcRenderer]. MaxListeners is 10. Use emitter.setMaxListeners() to increase limit
[2] (Use `Electron Helper (Renderer) --trace-warnings ...` to show where the warning was created)
[2] 14:43:11.163 › checkBiometricAuthChangedChildProcess-onMessage { type: 'checkBiometricAuthChanged', result: false }
[2] 14:43:14.298 › checkBiometricAuthChangedChildProcess-onMessage { type: 'checkBiometricAuthChanged', result: false }
[2] 14:43:24.197 › [NobleBLE] Noble library loaded
[2] 14:43:24.240 › [NobleBLE] Bluetooth state: poweredOn
[2] 14:43:24.241 › [NobleBLE] Persistent state listener setup
[2] 14:43:24.241 › [NobleBLE] Initial state detected: poweredOn
[2] 14:43:24.241 › [NobleBLE] Noble initialized successfully
[2] 14:43:24.241 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:24.241 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:25.268 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 0
[2] }
[2] 14:43:25.269 › [NobleBLE] Connect device request: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasDiscovered: false,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 0,
[2]   totalConnected: 0
[2] }
[2] 14:43:25.269 › [NobleBLE] Device not discovered, attempting targeted scan for: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:25.269 › [NobleBLE] Targeted scan started for device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:25.613 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:43:25.614 › [NobleBLE] Target device found: { id: '38fa0c1040f3e5884d1f0d5b2d4feb9d', name: 'K1510' }
[2] 14:43:25.614 › [NobleBLE] Connecting to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:26.675 › [NobleBLE] Connected to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:26.678 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:43:26.794 › [NobleBLE] No services found (attempt 1/3)
[2] 14:43:26.795 › [NobleBLE] Retrying service discovery in 500ms (attempt 2/3)
[2] 14:43:26.796 › [NobleBLE] Service discovery attempt 1 failed: No OneKey services found
[2] 14:43:27.302 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 2,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:43:27.871 › [NobleBLE] No services found (attempt 2/3)
[2] 14:43:27.873 › [NobleBLE] Retrying service discovery in 500ms (attempt 3/3)
[2] 14:43:27.874 › [NobleBLE] Service discovery attempt 2 failed: No OneKey services found
[2] 14:43:28.378 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 3,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:43:28.923 › [NobleBLE] No services found (attempt 3/3)
[2] 14:43:28.924 › [NobleBLE] Service discovery attempt 3 failed: No OneKey services found
[2] 14:43:28.929 › [NobleBLE] Service/characteristic discovery failed: HardwareError: No OneKey services found
[2]     at Object.TypedError (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:387:14)
[2]     at /Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11703:38
[2]     at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/peripheral.js:96:7)
[2]     at Object.onceWrapper (node:events:634:26)
[2]     at Peripheral.emit (node:events:519:28)
[2]     at Noble.onServicesDiscover (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:337:16)
[2]     at NobleMac.emit (node:events:519:28)
[2] Error occurred in handler for '$onekey-noble-ble-connect': HardwareError: No OneKey services found
[2]     at Object.TypedError (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:387:14)
[2]     at /Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11703:38
[2]     at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/peripheral.js:96:7)
[2]     at Object.onceWrapper (node:events:634:26)
[2]     at Peripheral.emit (node:events:519:28)
[2]     at Noble.onServicesDiscover (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:337:16)
[2]     at NobleMac.emit (node:events:519:28) {
[2]   errorCode: 706,
[2]   params: undefined,
[2]   attemptNumber: 3,
[2]   retriesLeft: 0
[2] }
[2] 14:43:28.931 › [NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: true,
[2]   hasCharacteristics: false,
[2]   stackTrace: [
[2]     '    at handleDeviceDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11515:29)',
[2]     '    at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11535:9)',
[2]     '    at Peripheral.emit (node:events:519:28)',
[2]     '    at Noble.onDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:250:16)'
[2]   ]
[2] }
[2] 14:43:28.931 › [NobleBLE] Device state cleaned up: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:28.940 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:28.941 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:28.953 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 0
[2] }
[2] 14:43:28.954 › [NobleBLE] Connect device request: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasDiscovered: true,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 1,
[2]   totalConnected: 0
[2] }
[2] 14:43:28.954 › [NobleBLE] Connecting to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:29.673 › [NobleBLE] Connected to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:29.673 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:43:29.852 › [NobleBLE] Found service: 0001
[2] 14:43:30.033 › [NobleBLE] Discovered characteristics: { count: 2, uuids: [ '0002', '0003' ] }
[2] 14:43:30.035 › [NobleBLE] Characteristic discovery result: { writeFound: true, notifyFound: true }
[2] 14:43:30.036 › [NobleBLE] Device ready for communication: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:30.038 › [NobleBLE] Subscribing to notifications for device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:30.038 › [NobleBLE] 🔄 Starting subscription process... { deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d' }
[2] 14:43:30.156 › [NobleBLE] ✅ Notification subscription successful
[2] 14:43:30.163 › [NobleBLE] Writing data: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   dataLength: 64,
[2]   firstBytes: '3f23230000000000'
[2] }
[2] 14:43:31.142 › [NobleBLE] Packet complete: { deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d', length: 480 }
[2] 14:43:31.154 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: true,
[2]   hasCharacteristics: true,
[2]   totalConnectedDevices: 1
[2] }
[2] 14:43:31.155 › [NobleBLE] Connect device request: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasDiscovered: true,
[2]   hasConnected: true,
[2]   hasCharacteristics: true,
[2]   totalDiscovered: 1,
[2]   totalConnected: 1
[2] }
[2] 14:43:31.155 › [NobleBLE] Connecting to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:31.155 › [NobleBLE] Device already connected, skipping connection step
[2] 14:43:31.155 › [NobleBLE] Device characteristics already available
[2] 14:43:31.155 › [NobleBLE] Device already has active notification subscription, reusing connection
[2] 14:43:31.156 › [NobleBLE] Subscribing to notifications for device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:31.156 › [NobleBLE] Device already subscribed to characteristic, updating callback only
[2] 14:43:31.157 › [NobleBLE] Writing data: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   dataLength: 64,
[2]   firstBytes: '3f23230000000000'
[2] }
[2] 14:43:32.013 › [NobleBLE] Packet complete: { deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d', length: 480 }
[2] 14:43:32.952 › [NobleBLE] Unsubscribing from notifications for device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:32.982 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:32.983 › Bluetooth availability check completed: {
[2]   available: true,
[2]   state: 'poweredOn',
[2]   unsupported: false,
[2]   initialized: true
[2] }
[2] 14:43:32.991 › [NobleBLE] Starting device enumeration
[2] 14:43:32.992 › [NobleBLE] Scanning started for OneKey devices
[2] 14:43:33.031 › [NobleBLE] Notification unsubscription successful
[2] 14:43:33.032 › [NobleBLE] Device state cleaned up: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:43:33.309 › [NobleBLE] Discovered OneKey device: K5109
[2] 14:43:33.333 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:43:33.631 › [NobleBLE] Discovered OneKey device: Pro 723A
[2] 14:43:34.827 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:43:35.728 › [NobleBLE] Discovered OneKey device: Touch 589B
[2] 14:43:37.998 › [NobleBLE] Scan completed, found devices: 5
[2] 14:43:37.998 › Enumeration completed, devices: [
[2]   {
[2]     id: '74bd90424494cad0a9c20b26c4f59667',
[2]     name: 'K5109',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '9aa5e448398705936cf37a3d917c0aeb',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '218cc2a04b1362629e48d5a750482811',
[2]     name: 'Pro 723A',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '0078cac4498be7570652e5dc70b03e51',
[2]     name: 'Touch 589B',
[2]     state: 'disconnected'
[2]   }
[2] ]
[2] 14:43:38.001 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 0
[2] }
[2] 14:43:38.001 › [NobleBLE] Connect device request: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   hasDiscovered: true,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 5,
[2]   totalConnected: 0
[2] }
[2] 14:43:38.001 › [NobleBLE] Connecting to device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:43:39.218 › [NobleBLE] Connected to device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:43:39.219 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:43:39.511 › [NobleBLE] Found service: 0001
[2] 14:43:39.632 › [NobleBLE] Discovered characteristics: { count: 2, uuids: [ '0002', '0003' ] }
[2] 14:43:39.633 › [NobleBLE] Characteristic discovery result: { writeFound: true, notifyFound: true }
[2] 14:43:39.633 › [NobleBLE] Device ready for communication: 74bd90424494cad0a9c20b26c4f59667
[2] 14:43:39.633 › [NobleBLE] Subscribing to notifications for device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:43:39.633 › [NobleBLE] 🔄 Starting subscription process... { deviceId: '74bd90424494cad0a9c20b26c4f59667' }
[2] 14:44:09.672 › [NobleBLE] ✅ Notification subscription successful
[2] 14:44:09.677 › [NobleBLE] Writing data: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   dataLength: 64,
[2]   firstBytes: '3f23230000000000'
[2] }
[2] 14:44:09.755 › [NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   hasPeripheral: true,
[2]   hasCharacteristics: true,
[2]   stackTrace: [
[2]     '    at handleDeviceDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11515:29)',
[2]     '    at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11535:9)',
[2]     '    at Peripheral.emit (node:events:519:28)',
[2]     '    at Noble.onDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:250:16)'
[2]   ]
[2] }
[2] 14:44:09.755 › [NobleBLE] Pairing rejection detected, sending error notification
[2] 14:44:09.756 › [NobleBLE] Device state cleaned up: 74bd90424494cad0a9c20b26c4f59667
[2] 14:44:10.759 › [NobleBLE] Starting device enumeration
[2] 14:44:10.760 › [NobleBLE] Scanning started for OneKey devices
[2] 14:44:10.811 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:10.838 › [NobleBLE] Discovered OneKey device: K5109
[2] 14:44:11.127 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:12.328 › [NobleBLE] Discovered OneKey device: Pro 2496
[2] 14:44:13.218 › [NobleBLE] Discovered OneKey device: Pro 723A
[2] 14:44:14.114 › [NobleBLE] Discovered OneKey device: Pro 2DD9
[2] 14:44:14.122 › [NobleBLE] Discovered OneKey device: Touch 589B
[2] 14:44:15.765 › [NobleBLE] Scan completed, found devices: 7
[2] 14:44:15.766 › Enumeration completed, devices: [
[2]   {
[2]     id: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '74bd90424494cad0a9c20b26c4f59667',
[2]     name: 'K5109',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '9aa5e448398705936cf37a3d917c0aeb',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '582b3724e1469405b06b0c1c9773f198',
[2]     name: 'Pro 2496',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '218cc2a04b1362629e48d5a750482811',
[2]     name: 'Pro 723A',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: 'b5fb363fd39801cce6df88bc74ff06ce',
[2]     name: 'Pro 2DD9',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '0078cac4498be7570652e5dc70b03e51',
[2]     name: 'Touch 589B',
[2]     state: 'disconnected'
[2]   }
[2] ]
[2] 14:44:15.768 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 0
[2] }
[2] 14:44:15.768 › [NobleBLE] Connect device request: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasDiscovered: true,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 7,
[2]   totalConnected: 0
[2] }
[2] 14:44:15.768 › [NobleBLE] Connecting to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:44:16.473 › [NobleBLE] Connected to device: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:44:16.473 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:44:16.615 › [NobleBLE] No services found (attempt 1/3)
[2] 14:44:16.616 › [NobleBLE] Retrying service discovery in 500ms (attempt 2/3)
[2] 14:44:16.616 › [NobleBLE] Service discovery attempt 1 failed: No OneKey services found
[2] 14:44:17.120 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 2,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:44:17.672 › [NobleBLE] No services found (attempt 2/3)
[2] 14:44:17.672 › [NobleBLE] Retrying service discovery in 500ms (attempt 3/3)
[2] 14:44:17.672 › [NobleBLE] Service discovery attempt 2 failed: No OneKey services found
[2] 14:44:18.177 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   peripheralState: 'connected',
[2]   attempt: 3,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:44:18.722 › [NobleBLE] No services found (attempt 3/3)
[2] 14:44:18.722 › [NobleBLE] Service discovery attempt 3 failed: No OneKey services found
[2] 14:44:18.723 › [NobleBLE] Service/characteristic discovery failed: HardwareError: No OneKey services found
[2]     at Object.TypedError (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:387:14)
[2]     at /Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11703:38
[2]     at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/peripheral.js:96:7)
[2]     at Object.onceWrapper (node:events:634:26)
[2]     at Peripheral.emit (node:events:519:28)
[2]     at Noble.onServicesDiscover (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:337:16)
[2]     at NobleMac.emit (node:events:519:28)
[2] Error occurred in handler for '$onekey-noble-ble-connect': HardwareError: No OneKey services found
[2]     at Object.TypedError (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:387:14)
[2]     at /Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11703:38
[2]     at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/peripheral.js:96:7)
[2]     at Object.onceWrapper (node:events:634:26)
[2]     at Peripheral.emit (node:events:519:28)
[2]     at Noble.onServicesDiscover (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:337:16)
[2]     at NobleMac.emit (node:events:519:28) {
[2]   errorCode: 706,
[2]   params: undefined,
[2]   attemptNumber: 3,
[2]   retriesLeft: 0
[2] }
[2] 14:44:18.723 › [NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED: {
[2]   deviceId: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]   hasPeripheral: true,
[2]   hasCharacteristics: false,
[2]   stackTrace: [
[2]     '    at handleDeviceDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11515:29)',
[2]     '    at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11535:9)',
[2]     '    at Peripheral.emit (node:events:519:28)',
[2]     '    at Noble.onDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:250:16)'
[2]   ]
[2] }
[2] 14:44:18.723 › [NobleBLE] Device state cleaned up: 38fa0c1040f3e5884d1f0d5b2d4feb9d
[2] 14:44:20.227 › [NobleBLE] Starting device enumeration
[2] 14:44:20.227 › [NobleBLE] Scanning started for OneKey devices
[2] 14:44:20.291 › [NobleBLE] Discovered OneKey device: Touch 589B
[2] 14:44:20.571 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:21.172 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:22.083 › [NobleBLE] Discovered OneKey device: K5109
[2] 14:44:23.566 › [NobleBLE] Discovered OneKey device: Pro 2496
[2] 14:44:25.231 › [NobleBLE] Scan completed, found devices: 5
[2] 14:44:25.232 › Enumeration completed, devices: [
[2]   {
[2]     id: '0078cac4498be7570652e5dc70b03e51',
[2]     name: 'Touch 589B',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '9aa5e448398705936cf37a3d917c0aeb',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '74bd90424494cad0a9c20b26c4f59667',
[2]     name: 'K5109',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '582b3724e1469405b06b0c1c9773f198',
[2]     name: 'Pro 2496',
[2]     state: 'disconnected'
[2]   }
[2] ]
[2] 14:44:25.236 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '0078cac4498be7570652e5dc70b03e51',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 0
[2] }
[2] 14:44:25.237 › [NobleBLE] Connect device request: {
[2]   deviceId: '0078cac4498be7570652e5dc70b03e51',
[2]   hasDiscovered: true,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 5,
[2]   totalConnected: 0
[2] }
[2] 14:44:25.237 › [NobleBLE] Connecting to device: 0078cac4498be7570652e5dc70b03e51
[2] Error occurred in handler for '$onekey-noble-ble-connect': HardwareError: Connection timeout
[2]     at Object.TypedError (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:387:14)
[2]     at Timeout._onTimeout (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11852:36)
[2]     at listOnTimeout (node:internal/timers:581:17)
[2]     at process.processTimers (node:internal/timers:519:7) {
[2]   errorCode: 704,
[2]   params: undefined
[2] }
[2] 14:44:30.496 › [NobleBLE] Starting device enumeration
[2] 14:44:30.497 › [NobleBLE] Scanning started for OneKey devices
[2] 14:44:30.545 › [NobleBLE] Discovered OneKey device: K5109
[2] 14:44:30.552 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:31.295 › [NobleBLE] Connected to device: 0078cac4498be7570652e5dc70b03e51
[2] 14:44:31.296 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '0078cac4498be7570652e5dc70b03e51',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:44:31.449 › [NobleBLE] Discovered OneKey device: K1510
[2] 14:44:32.612 › [NobleBLE] Found service: 0001
[2] 14:44:33.481 › [NobleBLE] Discovered characteristics: { count: 2, uuids: [ '0002', '0003' ] }
[2] 14:44:33.482 › [NobleBLE] Characteristic discovery result: { writeFound: true, notifyFound: true }
[2] 14:44:33.482 › [NobleBLE] Device ready for communication: 0078cac4498be7570652e5dc70b03e51
[2] 14:44:35.498 › [NobleBLE] Scan completed, found devices: 3
[2] 14:44:35.500 › Enumeration completed, devices: [
[2]   {
[2]     id: '74bd90424494cad0a9c20b26c4f59667',
[2]     name: 'K5109',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '38fa0c1040f3e5884d1f0d5b2d4feb9d',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   },
[2]   {
[2]     id: '9aa5e448398705936cf37a3d917c0aeb',
[2]     name: 'K1510',
[2]     state: 'disconnected'
[2]   }
[2] ]
[2] 14:44:35.503 › [NobleBLE] IPC CONNECT request received: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   hasPeripheral: false,
[2]   hasCharacteristics: false,
[2]   totalConnectedDevices: 1
[2] }
[2] 14:44:35.503 › [NobleBLE] Connect device request: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   hasDiscovered: true,
[2]   hasConnected: false,
[2]   hasCharacteristics: false,
[2]   totalDiscovered: 3,
[2]   totalConnected: 1
[2] }
[2] 14:44:35.504 › [NobleBLE] Connecting to device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:44:36.139 › [NobleBLE] Connected to device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:44:36.139 › [NobleBLE] Starting service discovery: {
[2]   deviceId: '74bd90424494cad0a9c20b26c4f59667',
[2]   peripheralState: 'connected',
[2]   attempt: 1,
[2]   maxRetries: 3,
[2]   targetUUIDs: [ '00000001-0000-1000-8000-00805f9b34fb' ]
[2] }
[2] 14:44:36.407 › [NobleBLE] Found service: 0001
[2] 14:44:36.527 › [NobleBLE] Discovered characteristics: { count: 2, uuids: [ '0002', '0003' ] }
[2] 14:44:36.528 › [NobleBLE] Characteristic discovery result: { writeFound: true, notifyFound: true }
[2] 14:44:36.529 › [NobleBLE] Device ready for communication: 74bd90424494cad0a9c20b26c4f59667
[2] 14:44:36.529 › [NobleBLE] Subscribing to notifications for device: 74bd90424494cad0a9c20b26c4f59667
[2] 14:44:36.530 › [NobleBLE] 🔄 Starting subscription process... { deviceId: '74bd90424494cad0a9c20b26c4f59667' }
[2] 14:44:42.210 › [NobleBLE] ⚠️  DEVICE DISCONNECT DETECTED: {
[2]   deviceId: '0078cac4498be7570652e5dc70b03e51',
[2]   hasPeripheral: true,
[2]   hasCharacteristics: true,
[2]   stackTrace: [
[2]     '    at handleDeviceDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11515:29)',
[2]     '    at Peripheral.<anonymous> (/Users/leon/Documents/onekey/x-app-monorepo/apps/desktop/app/dist/app.js:11535:9)',
[2]     '    at Peripheral.emit (node:events:519:28)',
[2]     '    at Noble.onDisconnect (/Users/leon/Documents/onekey/x-app-monorepo/node_modules/@abandonware/noble/lib/noble.js:250:16)'
[2]   ]
[2] }
[2] 14:44:42.210 › [NobleBLE] Device state cleaned up: 0078cac4498be7570652e5dc70b03e51
