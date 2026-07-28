import HardwareSDK from "@onekeyfe/hd-common-connect-sdk";
import { createDeferred } from "./utils";

const UI_EVENT = "UI_EVENT";
const UI_REQUEST = {
  REQUEST_PIN: "ui-request_pin",
  REQUEST_PASSPHRASE: "ui-request_passphrase",
  REQUEST_PASSPHRASE_ON_DEVICE: "ui-request_passphrase_on_device",
  REQUEST_BUTTON: "ui-button",
  CLOSE_UI_WINDOW: "ui-close_window",
};
const UI_RESPONSE = {
  RECEIVE_PIN: "ui-receive_pin",
  RECEIVE_PASSPHRASE: "ui-receive_passphrase",
};

let bridge;
function setupWKWebViewJavascriptBridge(callback) {
  if (window.WKWebViewJavascriptBridge) {
    return callback(WKWebViewJavascriptBridge);
  }
  if (window.WKWVJBCallbacks) {
    return window.WKWVJBCallbacks.push(callback);
  }
  window.WKWVJBCallbacks = [callback];
  window.webkit.messageHandlers.iOS_Native_InjectJavascript.postMessage(null);
}

setupWKWebViewJavascriptBridge(function (_bridge) {
  console.log("bridge init success");
  bridge = _bridge;
  registerBridgeHandler(_bridge);
});

let isInitialized = false;
function getHardwareSDKInstance() {
  return new Promise(async (resolve, reject) => {
    if (!bridge) {
      throw new Error("bridge is not connected");
    }
    if (isInitialized) {
      console.log("already initialized, skip");
      resolve(HardwareSDK);
      return;
    }

    const settings = {
      env: "lowlevel",
      fetchConfig: true,
      debug: true,
    };

    const plugin = createLowlevelPlugin();

    try {
      await HardwareSDK.init(settings, undefined, plugin);
      console.log("HardwareSDK init success");
      isInitialized = true;
      resolve(HardwareSDK);
      listenHardwareEvent(HardwareSDK);
    } catch (e) {
      reject(e);
    }
  });
}

let runPromise;
let receiveQueue = [];
let receiveGeneration = 0;
let activeConnection;

function resetReceiveState(reason) {
  receiveGeneration += 1;
  receiveQueue = [];
  if (runPromise) {
    const current = runPromise;
    runPromise = undefined;
    current.reject(new Error(reason));
  }
}

function resolveReceive(hexString) {
  if (!activeConnection) {
    return;
  }
  if (runPromise?.generation === receiveGeneration) {
    const current = runPromise;
    runPromise = undefined;
    current.resolve(hexString);
    return;
  }
  receiveQueue.push({ generation: receiveGeneration, hexString });
}

function createLowlevelPlugin() {
  const plugin = {
    enumerate: () => {
      return new Promise((resolve) => {
        bridge.callHandler("enumerate", {}, (response) => {
          console.log("===> call enumerate response: ", response);
          resolve(response);
        });
      });
    },
    send: (uuid, data) => {
      return new Promise((resolve) => {
        bridge.callHandler("send", { uuid, data }, (response) => {
          resolve(response);
        });
      });
    },
    receive: (uuid) => {
      if (uuid !== activeConnection) {
        return Promise.reject(new Error(`No active connection for ${uuid}`));
      }
      while (receiveQueue.length > 0) {
        const queued = receiveQueue.shift();
        if (queued.generation === receiveGeneration) {
          return Promise.resolve(queued.hexString);
        }
      }
      const deferred = createDeferred();
      runPromise = { ...deferred, generation: receiveGeneration };
      return deferred.promise;
    },
    connect: (uuid) => {
      const connectionChanged = activeConnection !== uuid;
      if (connectionChanged) {
        activeConnection = undefined;
        resetReceiveState(`Connection changed to ${uuid}`);
      }
      const generation = receiveGeneration;
      return new Promise((resolve, reject) => {
        bridge.callHandler("connect", { uuid });
        bridge.registerHandler("connectFinished", () => {
          if (generation !== receiveGeneration) {
            reject(new Error(`Stale connection callback for ${uuid}`));
            return;
          }
          activeConnection = uuid;
          resolve();
        });
      });
    },
    disconnect: (uuid) => {
      if (activeConnection === uuid) {
        activeConnection = undefined;
      }
      resetReceiveState(`Disconnected from ${uuid}`);
      return new Promise((resolve) => {
        bridge.callHandler("disconnect", { uuid }, (response) => {
          console.log("call connect response: ", response);
          resolve(response);
        });
      });
    },

    init: () => {
      console.log("call init");
      return Promise.resolve();
    },

    version: "OneKey-1.0",
  };

  return plugin;
}

function listenHardwareEvent(SDK) {
  SDK.on(UI_EVENT, (message) => {
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      // Request PIN from iOS app or use hardware PIN
      console.log("PIN requested, calling requestPinInput handler");
      bridge.callHandler("requestPinInput", {}, (response) => {
        // If response is not empty, use it as PIN, otherwise use hardware PIN
        const pinPayload =
          response && response !== ""
            ? response
            : "@@ONEKEY_INPUT_PIN_IN_DEVICE";
        console.log(
          "PIN response received:",
          response ? "PIN entered" : "Using hardware PIN"
        );
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: pinPayload,
        });
      });
    }
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      // enter passphrase on the device
      SDK.uiResponse({
        type: UI_RESPONSE.RECEIVE_PASSPHRASE,
        payload: {
          value: "",
          passphraseOnDevice: false,
          save: false,
        },
      });
    }
    if (message.type === UI_REQUEST.REQUEST_BUTTON) {
      console.log("Button confirmation requested, showing prompt on iOS");
      // Notify iOS to show a confirmation dialog
      bridge.callHandler("requestButtonConfirmation", {
        message: message.payload?.message || "Please confirm on your device",
      });
    }

    if (message.type === UI_REQUEST.CLOSE_UI_WINDOW) {
      console.log("Request to close UI window received");
      // Notify iOS to close any open prompts/dialogs
      bridge.callHandler("closeUIWindow", {});
    }
  });
}

function registerBridgeHandler() {
  bridge.registerHandler("init", async (data, callback) => {
    try {
      await getHardwareSDKInstance();
      callback({ success: true });
    } catch (e) {
      console.error(e);
      callback({ success: false, error: e.message });
    }
  });
  bridge.registerHandler("bridgeCommonCall", async (data, callback) => {
    console.log("bridgeCommonCall", data);
    try {
      const { name, data: methodData } = data;
      const { connectId, deviceId, ...params } = methodData;

      const SDK = await getHardwareSDKInstance();

      let response;
      if (!SDK[name]) {
        throw new Error(`Method ${name} not found`);
      }

      // Handle different parameter patterns
      response = await SDK[name](connectId, deviceId, params);

      callback(response);
    } catch (e) {
      console.error(e);
      callback({ success: false, error: e.message });
    }
  });

  bridge.registerHandler("monitorCharacteristic", async (hexString) => {
    try {
      resolveReceive(hexString);
    } catch (e) {
      console.log("monitor data error: ", e);
      resetReceiveState(`Monitor failed: ${e.message}`);
    }
  });
}
