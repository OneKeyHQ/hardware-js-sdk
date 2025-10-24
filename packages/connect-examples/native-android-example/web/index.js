import HardwareSDK from "@onekeyfe/hd-common-connect-sdk";
import { createDeferred, isHeaderChunk, COMMON_HEADER_SIZE } from "./utils";

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
function connectWebViewJavascriptBridge(callback) {
  if (window.WebViewJavascriptBridge && WebViewJavascriptBridge.inited) {
    callback(WebViewJavascriptBridge);
  } else {
    console.log("wait bridge init success");
    window.document.addEventListener(
      "WebViewJavascriptBridgeReady",
      function () {
        callback(WebViewJavascriptBridge);
      },
      false
    );
  }
}

connectWebViewJavascriptBridge(function (_bridge) {
  console.log("bridge init success");
  bridge = _bridge;
  registerBridgeHandler(_bridge);
});

let isInitialized = false;
function getHardwareSDKInstance() {
  return new Promise(async (resolve, reject) => {
    if (!window.WebViewJavascriptBridge) {
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
      debug: false,
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
function createLowlevelPlugin() {
  const plugin = {
    enumerate: () => {
      return new Promise((resolve) => {
        bridge.callHandler("enumerate", {}, (response) => {
          console.log("===> call enumerate response: ", response);
          resolve(JSON.parse(response));
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
    receive: () => {
      return new Promise((resolve) => {
        runPromise = createDeferred();
        const response = runPromise.promise;
        resolve(response);
      });
    },
    connect: (uuid) => {
      return new Promise((resolve) => {
        bridge.callHandler("connect", { uuid }, () => {
          resolve();
        });
      });
    },
    disconnect: (uuid) => {
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
      // Request PIN from Android app or use hardware PIN
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
      console.log("Button confirmation requested, showing prompt on client");
      // Just notify Android to show a confirmation dialog, no callback needed
      bridge.callHandler("requestButtonConfirmation", {
        message: message.payload?.message || "Please confirm on your device",
      });
    }

    if (message.type === UI_REQUEST.CLOSE_UI_WINDOW) {
      console.log("Request to close UI window received");
      // Just notify Android to close any open prompts/dialogs, no callback needed
      bridge.callHandler("closeUIWindow", {});
    }
  });
}

function registerBridgeHandler() {
  bridge.registerHandler("bridgeCommonCall", async (data, callback) => {
    console.log("bridgeCommonCall", data);
    try {
      const { name, data: methodData } = JSON.parse(data);
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

  // Keep the original monitorCharacteristic handler
  let bufferLength = 0;
  let buffer = [];
  bridge.registerHandler("monitorCharacteristic", async (hexString) => {
    if (!runPromise) {
      console.log("runPromise is not initialized, maybe not call receive");
      return;
    }
    try {
      const data = Buffer.from(hexString, "hex");
      if (isHeaderChunk(data)) {
        bufferLength = data.readInt32BE(5);
        buffer = [...data.subarray(3)];
      } else {
        buffer = buffer.concat([...data]);
      }
      if (buffer.length - COMMON_HEADER_SIZE >= bufferLength) {
        const value = Buffer.from(buffer);
        console.log(
          "[onekey-js-bridge] Received a complete packet of data, resolve Promise, ",
          "buffer: ",
          value
        );
        bufferLength = 0;
        buffer = [];
        runPromise.resolve(value.toString("hex"));
      }
    } catch (e) {
      console.log("monitor data error: ", e);
      runPromise.reject(e);
    }
  });
}
