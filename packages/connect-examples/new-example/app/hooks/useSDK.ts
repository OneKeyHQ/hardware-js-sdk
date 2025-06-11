import { createContext, useContext } from "react";
import { CoreApi } from "@onekeyfe/hd-core";
import { ApiResponse, HardwareApiMethod, callHardwareAPI } from "../services/hardwareService";

export interface SDKContextType {
  initializeSDK: () => Promise<void>;
  getSDKInstance: () => Promise<CoreApi>;
}

export const SDKContext = createContext<SDKContextType | null>(null);

// 基础的useSDK hook
export const useSDK = () => {
  const context = useContext(SDKContext);

  if (!context) {
    throw new Error("useSDK must be used within SDKProvider");
  }

  return context;
};

// 优化的useHardwareAPI hook - 简化SDK调用
export const useHardwareAPI = () => {
  const { getSDKInstance } = useSDK();

  // 直接调用SDK方法的简化接口
  const call = async (
    method: HardwareApiMethod,
    params: Record<string, unknown> = {}
  ): Promise<ApiResponse> => {
    return callHardwareAPI(method, params);
  };

  // 获取原始SDK实例（高级用户）
  const getSDK = async (): Promise<CoreApi> => {
    return getSDKInstance();
  };

  return {
    call,      // 简化的方法调用
    getSDK,    // 原始SDK实例
  };
}; 