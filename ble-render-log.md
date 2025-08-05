🔍 shouldSwitchTransportType called with: {hardwareCallContext: 'user_interaction', forceTransportType: undefined, operationId: undefined}
HardwareConnectionManager.ts:166 🔍 detectBluetoothAvailability
HardwareConnectionManager.ts:185 🔍 detectBluetoothAvailability bleAvailableState:  {available: true, state: 'poweredOn', unsupported: false, initialized: true}
HardwareConnectionManager.ts:300 🔍 CACHE RESULT: shouldSwitch=false, targetType=desktop-web-ble, context=user_interaction
ServiceHardware.ts:1557 🔍 shouldSwitchTransportType result: {shouldSwitch: false, targetType: 'desktop-web-ble'}
serviceHardwareUtils.ts:2 ServiceHardwareLog@checkAllFirmwareRelease
ServiceFirmwareUpdate.ts:329 @onekey/hd-core cancel API:  {event: 'iframe-cancel', type: 'iframe-cancel', payload: {…}}
ServiceFirmwareUpdate.ts:329 @onekey/hd-core Cancel Api connect requestQueues: length:0 requestIds:
ServiceFirmwareUpdate.ts:329 @onekey/hd-core Cleanup...
ServiceFirmwareUpdate.ts:329 [Method] hd-common-connect-sdk handleMessage {event: 'UI_EVENT', type: 'ui-close_window', payload: undefined}
ServiceFirmwareUpdate.ts:341 @onekey/hd-core cancel API:  {event: 'iframe-cancel', type: 'iframe-cancel', payload: {…}}
ServiceFirmwareUpdate.ts:341 @onekey/hd-core Cancel Api all _deviceList:
ServiceFirmwareUpdate.ts:341 @onekey/hd-core Cleanup...
ServiceFirmwareUpdate.ts:341 [Method] hd-common-connect-sdk handleMessage {event: 'UI_EVENT', type: 'ui-close_window', payload: undefined}
serviceHardwareUtils.ts:2 ServiceHardwareLog@call getFeatures() 38fa0c1040f3e5884d1f0d5b2d4feb9d
ServiceHardware.ts:829 [Method] call:  {retryCount: 0, detectBootloaderDevice: true, skipWebDevicePrompt: true, connectId: '38fa0c1040f3e5884d1f0d5b2d4feb9d', method: 'getFeatures'}
ServiceHardware.ts:829 @onekey/hd-core call API:  {event: 'iframe-call', type: 'iframe-call', payload: {…}, id: '1'}
index.js:809 @onekey/hd-core EnsureConnected function start, MAX_RETRY_COUNT=0, POLL_INTERVAL_TIME=1000
index.js:809 @onekey/hd-core EnsureConnected function try count:  1  poll interval time:  1000
index.js:809 Transport Initializing transports
index.js:809 @onekey/hd-web-ble-transport [Transport] Noble BLE Transport initialized
index.js:809 Transport Configuring transports
index.js:809 Transport Configuring transports done
index.js:809 DeviceConnector acquire 38fa0c1040f3e5884d1f0d5b2d4feb9d undefined
ServiceHardware.ts:829 @onekey/hd-web-ble-transport [Transport] Noble BLE acquire failed: Error: Error invoking remote method '$onekey-noble-ble-connect': HardwareError: No OneKey services found
    at IpcRenderer.invoke (node:electron/js2c/renderer_init:2:6969)
error @ index.js:793
eval @ index.js:400
rejected @ index.js:34
Promise.then (async)
step @ index.js:35
fulfilled @ index.js:33
Promise.then (async)
step @ index.js:35
eval @ index.js:36
__awaiter @ index.js:32
acquire @ index.js:349
eval @ index.js:38290
eval @ index.js:721
__awaiter @ index.js:717
acquire @ index.js:38284
eval @ index.js:26663
eval @ index.js:721
__awaiter @ index.js:717
acquire @ index.js:26658
eval @ index.js:38753
eval @ index.js:721
__awaiter @ index.js:717
connectDeviceForBle @ index.js:38751
eval @ index.js:38839
fulfilled @ index.js:718
Promise.then (async)
step @ index.js:720
eval @ index.js:721
__awaiter @ index.js:717
eval @ index.js:38777
eval @ index.js:38777
eval @ index.js:721
__awaiter @ index.js:717
poll @ index.js:38776
eval @ index.js:38887
eval @ index.js:721
__awaiter @ index.js:717
ensureConnected @ index.js:38769
eval @ index.js:38535
fulfilled @ index.js:718
Promise.then (async)
step @ index.js:720
eval @ index.js:721
__awaiter @ index.js:717
onCallDevice @ index.js:38515
eval @ index.js:38494
fulfilled @ index.js:718
Promise.then (async)
step @ index.js:720
eval @ index.js:721
__awaiter @ index.js:717
callAPI @ index.js:38456
eval @ index.js:39102
eval @ index.js:721
__awaiter @ index.js:717
handleMessage @ index.js:39078
eval @ index.js:637
step @ index.js:77
eval @ index.js:58
eval @ index.js:51
__awaiter @ index.js:47
postMessage @ index.js:626
eval @ index.js:686
step @ index.js:77
eval @ index.js:58
eval @ index.js:51
__awaiter @ index.js:47
call @ index.js:676
getFeatures @ index.js:49
features.silentMode.silentMode @ ServiceHardware.ts:829
convertDeviceResponse @ deviceErrorUtils.ts:238
ServiceHardware._getFeaturesLowLevel @ ServiceHardware.ts:828
await in ServiceHardware._getFeaturesLowLevel (async)
eval @ backgroundUtils.ts:206
eval @ backgroundUtils.ts:194
eval @ ServiceHardware.ts:849
eval @ index.mjs:46
fulfilled @ index.mjs:18
Promise.then (async)
step @ index.mjs:20
eval @ index.mjs:21
__awaiter$2 @ index.mjs:17
runExclusive @ index.mjs:43
fn @ ServiceHardware.ts:848
ServiceHardware._getFeaturesWithMutex @ ServiceHardware.ts:854
getFeaturesWithoutCache @ ServiceHardware.ts:878
checkDeviceIsBootloaderMode @ ServiceFirmwareUpdate.ts:156
checkAllFirmwareRelease @ ServiceFirmwareUpdate.ts:346
await in checkAllFirmwareRelease (async)
descriptor.value @ backgroundDecorators.ts:203
callBackgroundMethod @ BackgroundApiProxyBase.ts:163
callBackground @ BackgroundApiProxyBase.ts:196
_proxyServiceCache.<computed> @ BackgroundServiceProxyBase.ts:39
PageFirmwareUpdateChangeLog.watchLoading @ PageFirmwareUpdateChangeLog.tsx:72
await in PageFirmwareUpdateChangeLog.watchLoading (async)
methodWithNonce @ usePromiseResult.ts:167
runner @ usePromiseResult.ts:193
callback @ usePromiseResult.ts:268
eval @ usePromiseResult.ts:275
react-stack-bottom-frame @ react-dom-client.development.js:22509
runWithFiberInDEV @ react-dom-client.development.js:543
commitHookEffectListMount @ react-dom-client.development.js:10758
commitHookPassiveMountEffects @ react-dom-client.development.js:10878
reconnectPassiveEffects @ react-dom-client.development.js:12802
recursivelyTraverseReconnectPassiveEffects @ react-dom-client.development.js:12774
commitPassiveMountOnFiber @ react-dom-client.development.js:12731
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
Show 265 more frames
Show less
index.js:809 DeviceConnector acquire error:  Error invoking remote method '$onekey-noble-ble-connect': HardwareError: No OneKey services found
index.js:809 @onekey/hd-core device error:  HardwareError: Unknown error occurred. Check message property.
    at Object.TypedError (index.js:339:12)
    at safeThrowError (index.js:28020:31)
    at DeviceConnector.eval (index.js:38299:17)
    at Generator.throw (<anonymous>)
    at rejected (index.js:719:65)
index.js:809 @onekey/hd-core EnsureConnected get to max try count, will return:  1
index.js:38538 ensureConnected error:  HardwareError: Device not found
    at Object.TypedError (index.js:339:12)
    at eval (index.js:38877:40)
    at Generator.throw (<anonymous>)
    at rejected (index.js:719:65)
index.js:785 @onekey/hd-core call API Response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '1', success: false, payload: {…}}
index.js:809 [Method] response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '1', success: false, payload: {…}}
index.js:692 response.payload?.code:  105
serviceHardwareUtils.ts:2 ServiceHardwareLog@call getFeatures() 38fa0c1040f3e5884d1f0d5b2d4feb9d
HardwareConnectionManager.ts:258 🔍 shouldSwitchTransportType called with: {hardwareCallContext: 'user_interaction', forceTransportType: undefined, operationId: undefined}
HardwareConnectionManager.ts:166 🔍 detectBluetoothAvailability
HardwareConnectionManager.ts:185 🔍 detectBluetoothAvailability bleAvailableState:  {available: true, state: 'poweredOn', unsupported: false, initialized: true}
HardwareConnectionManager.ts:300 🔍 CACHE RESULT: shouldSwitch=false, targetType=desktop-web-ble, context=user_interaction
ServiceHardware.ts:829 [Method] call:  {allowEmptyConnectId: true, connectId: '38fa0c1040f3e5884d1f0d5b2d4feb9d', method: 'getFeatures'}
ServiceHardware.ts:829 @onekey/hd-core call API:  {event: 'iframe-call', type: 'iframe-call', payload: {…}, id: '2'}
index.js:809 @onekey/hd-core EnsureConnected function start, MAX_RETRY_COUNT=5, POLL_INTERVAL_TIME=1000
index.js:809 @onekey/hd-core EnsureConnected function try count:  1  poll interval time:  1000
index.js:809 Transport Initializing transports
index.js:809 @onekey/hd-web-ble-transport [Transport] Noble BLE Transport initialized
index.js:809 Transport Configuring transports
index.js:809 Transport Configuring transports done
index.js:809 DeviceConnector acquire 38fa0c1040f3e5884d1f0d5b2d4feb9d undefined
autoLogger.ts:26 AUTO-LOGS: OneKeyHardwareError: Device not found. Please try reconnecting the device (unplug and plug the USB or turn Bluetooth off and on), then try again.
    at convertDeviceError (deviceErrorUtils.ts:81:14)
    at convertDeviceResponse (deviceErrorUtils.ts:246:11)
    at async ServiceHardware._getFeaturesLowLevel (ServiceHardware.ts:828:22) {name: 'OneKeyHardwareError', constructorName: 'DeviceNotFound', className: 'DeviceNotFound', key: 'hardware.device_not_find_error', code: 105, …} file: /Users/leon/Documents/onekey/x-app-monorepo/packages/kit-bg/src/services/ServiceFirmwareUpdate/ServiceFirmwareUpdate.ts line: 170 column: 16
eval @ autoLogger.ts:26
eval @ timerUtils.ts:19
setTimeout (async)
__webpack_require__.g.<computed> @ timerUtils.ts:13
error @ autoLogger.ts:11
checkDeviceIsBootloaderMode @ ServiceFirmwareUpdate.ts:170
await in checkDeviceIsBootloaderMode (async)
checkAllFirmwareRelease @ ServiceFirmwareUpdate.ts:346
await in checkAllFirmwareRelease (async)
descriptor.value @ backgroundDecorators.ts:203
callBackgroundMethod @ BackgroundApiProxyBase.ts:163
callBackground @ BackgroundApiProxyBase.ts:196
_proxyServiceCache.<computed> @ BackgroundServiceProxyBase.ts:39
PageFirmwareUpdateChangeLog.watchLoading @ PageFirmwareUpdateChangeLog.tsx:72
await in PageFirmwareUpdateChangeLog.watchLoading (async)
methodWithNonce @ usePromiseResult.ts:167
runner @ usePromiseResult.ts:193
callback @ usePromiseResult.ts:268
eval @ usePromiseResult.ts:275
react-stack-bottom-frame @ react-dom-client.development.js:22509
runWithFiberInDEV @ react-dom-client.development.js:543
commitHookEffectListMount @ react-dom-client.development.js:10758
commitHookPassiveMountEffects @ react-dom-client.development.js:10878
reconnectPassiveEffects @ react-dom-client.development.js:12802
recursivelyTraverseReconnectPassiveEffects @ react-dom-client.development.js:12774
commitPassiveMountOnFiber @ react-dom-client.development.js:12731
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12755
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:12627
commitPassiveMountOnFiber @ react-dom-client.development.js:12646
Show 195 more frames
Show less
index.js:809 Device Expected uuid: 38fa0c1040f3e5884d1f0d5b2d4feb9d
index.js:809 Device getInternalState session cache:  {}
index.js:809 Device getInternalState session param:  device_id: undefined features.device_id: undefined passphraseState: undefined
index.js:809 Device Initialize device begin: {deviceId: undefined, passphraseState: undefined, initSession: undefined, InitializePayload: {…}}
index.js:809 DeviceCommands [DeviceCommands] [call] Sending Initialize
index.js:809 @onekey/hd-web-ble-transport [Transport] Noble BLE call name: Initialize data: {passphrase_state: undefined, is_contains_attach: true}
index.js:809 DeviceCommands [DeviceCommands] [call] Received Features
index.js:809 DeviceCommands _filterCommonTypes:  {type: 'Features', message: {…}}
index.js:809 Device Initialize device end:  {vendor: 'trezor.io', major_version: 2, minor_version: 99, patch_version: 99, bootloader_mode: null, …}
index.js:809 Transport Begin reconfiguring transports
index.js:809 @onekey/hd-core Call API - setDevice:  38fa0c1040f3e5884d1f0d5b2d4feb9d
index.js:809 @onekey/hd-core Call API - Device Run:  38fa0c1040f3e5884d1f0d5b2d4feb9d
index.js:809 DeviceConnector acquire 38fa0c1040f3e5884d1f0d5b2d4feb9d undefined
index.js:809 Device Expected uuid: 38fa0c1040f3e5884d1f0d5b2d4feb9d
index.js:809 Device getInternalState session cache:  {}
index.js:809 Device getInternalState session param:  device_id: undefined features.device_id: 120D13107C62B8D81922E625 passphraseState: undefined
index.js:809 Device Initialize device begin: {deviceId: undefined, passphraseState: undefined, initSession: undefined, InitializePayload: {…}}
index.js:809 DeviceCommands [DeviceCommands] [call] Sending Initialize
index.js:809 @onekey/hd-web-ble-transport [Transport] Noble BLE call name: Initialize data: {passphrase_state: undefined, is_contains_attach: true}
index.js:809 DeviceCommands [DeviceCommands] [call] Received Features
index.js:809 DeviceCommands _filterCommonTypes:  {type: 'Features', message: {…}}
index.js:809 Device Initialize device end:  {vendor: 'trezor.io', major_version: 2, minor_version: 99, patch_version: 99, bootloader_mode: null, …}
index.js:809 Device setInternalState session param:  state: 33d62a5ac458e49e34c260286cddd868733721025e9b17252b1690d933f4abcd initSession: undefined device_id: 120D13107C62B8D81922E625 passphraseState: undefined
index.js:809 [Method] hd-common-connect-sdk handleMessage {event: 'DEVICE_EVENT', type: 'features', payload: {…}}
index.js:809 Transport Begin reconfiguring transports
index.js:809 [Method] hd-common-connect-sdk handleMessage {event: 'FIRMWARE_EVENT', type: 'firmware-release-info', payload: {…}}
serviceHardwareUtils.ts:2 ServiceHardwareLog@FIRMWARE_EVENT>RELEASE_INFO:  {status: 'valid', changelog: Array(0), release: {…}, bootloaderMode: false, device: {…}, …}
serviceHardwareUtils.ts:2 ServiceHardwareLog@_checkFirmwareUpdate {status: 'valid', changelog: Array(0), release: {…}, bootloaderMode: false, device: {…}, …}
index.js:809 [Method] hd-common-connect-sdk handleMessage {event: 'FIRMWARE_EVENT', type: 'ble-firmware-release-info', payload: {…}}
serviceHardwareUtils.ts:2 ServiceHardwareLog@FIRMWARE_EVENT>BLE_RELEASE_INFO:  {status: 'valid', changelog: Array(0), release: {…}, bootloaderMode: false, device: {…}, …}
serviceHardwareUtils.ts:2 ServiceHardwareLog@showBleFirmwareReleaseInfo {status: 'valid', changelog: Array(0), release: {…}, bootloaderMode: false, device: {…}, …}
index.js:809 [Method] hd-common-connect-sdk handleMessage {event: 'DEVICE_EVENT', type: 'support_features', payload: {…}}
serviceHardwareUtils.ts:2 ServiceHardwareLog@features update {vendor: 'trezor.io', major_version: 2, minor_version: 99, patch_version: 99, bootloader_mode: null, …}
index.js:809 @onekey/hd-core Call API - Inner Method Run:
index.js:809 [Method] hd-common-connect-sdk handleMessage {event: 'UI_EVENT', type: 'ui-close_window', payload: undefined}
index.js:809 @onekey/hd-core Cleanup...
index.js:785 @onekey/hd-core call API Response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '2', success: true, payload: {…}}
index.js:809 [Method] response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '2', success: true, payload: {…}}
HardwareConnectionManager.ts:258 🔍 shouldSwitchTransportType called with: {hardwareCallContext: 'user_interaction', forceTransportType: undefined, operationId: undefined}
HardwareConnectionManager.ts:166 🔍 detectBluetoothAvailability
serviceHardwareUtils.ts:2 ServiceHardwareLog@_checkFirmwareUpdate updateInfo {connectId: '38fa0c1040f3e5884d1f0d5b2d4feb9d', hasUpgrade: true, hasUpgradeForce: false, fromVersion: '3.12.0', toVersion: '3.12.0', …}
HardwareConnectionManager.ts:185 🔍 detectBluetoothAvailability bleAvailableState:  {available: true, state: 'poweredOn', unsupported: false, initialized: true}
HardwareConnectionManager.ts:300 🔍 CACHE RESULT: shouldSwitch=false, targetType=desktop-web-ble, context=user_interaction
ServiceFirmwareUpdate.ts:522 [Method] call:  {checkBridgeRelease: true, connectId: undefined, method: 'checkAllFirmwareRelease'}
ServiceFirmwareUpdate.ts:522 @onekey/hd-core call API:  {event: 'iframe-call', type: 'iframe-call', payload: {…}, id: '3'}
index.js:809 @onekey/hd-core EnsureConnected function start, MAX_RETRY_COUNT=5, POLL_INTERVAL_TIME=1000
index.js:809 @onekey/hd-core EnsureConnected function try count:  1  poll interval time:  1000
index.js:809 Transport Initializing transports
index.js:809 @onekey/hd-web-ble-transport [Transport] Noble BLE Transport initialized
index.js:809 Transport Configuring transports
index.js:809 Transport Configuring transports done
index.js:809 Device release device, mainId:  38fa0c1040f3e5884d1f0d5b2d4feb9d
storageChecker.ts:51 checkIfDiskIsFull {quotaInGB: 461.00678212568164, usageInGB: 0.006721090525388718, availableInGB: 461.00006103515625}
index.js:809 DevicePool device pool -> current:  (5) [{…}, {…}, {…}, {…}, {…}]
index.js:809 DevicePool device pool -> upcomming:  (5) [{…}, {…}, {…}, {…}, {…}]
index.js:809 DevicePool DeviceCache.reportDeviceChange diff:  {connected: Array(5), disconnected: Array(0), changedSessions: Array(0), acquired: Array(0), released: Array(0), …}
index.js:809 DeviceConnector acquire 74bd90424494cad0a9c20b26c4f59667 undefined
index.js:38538 ensureConnected error:  HardwareError: Polling timeout
    at Object.TypedError (index.js:339:12)
    at eval (index.js:38800:40)
    at eval (timerUtils.ts:19:14)
index.js:785 @onekey/hd-core call API Response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '3', success: false, payload: {…}}
index.js:809 [Method] response:  {event: 'RESPONSE_EVENT', type: 'RESPONSE_EVENT', id: '3', success: false, payload: {…}}
index.js:692 response.payload?.code:  809
