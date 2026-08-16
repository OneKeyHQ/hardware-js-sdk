import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type DeviceFactoryInfoManufactureTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type DeviceFactoryInfo = {
  version?: number;
  serial_number?: string;
  burn_in_completed?: boolean;
  factory_test_completed?: boolean;
  manufacture_time?: DeviceFactoryInfoManufactureTime;
};

export type DeviceCertificate = {
  cert_and_pubkey?: string;
  private_key?: string;
};

export type DeviceCertificateSignature = {
  signature?: string;
};

export type DeviceFactoryInfoSetParams = {
  version: number;
  serial_number: string;
  burn_in_completed: boolean;
  factory_test_completed: boolean;
  manufacture_time: DeviceFactoryInfoManufactureTime;
};

export type DeviceFactoryCertificateWriteParams = {
  certificate: string;
  privateKey?: string;
};

export type DeviceFactoryChallengeSignParams = {
  digest: string;
};

type Success = { message?: string };

export type FactoryApi = {
  deviceProvisionFactoryInfo(
    connectId: string,
    params: CommonParams & DeviceFactoryInfoSetParams
  ): Response<Success>;
  deviceReadFactoryInfo(connectId: string, params?: CommonParams): Response<DeviceFactoryInfo>;
  deviceWriteFactoryCertificate(
    connectId: string,
    params: CommonParams & DeviceFactoryCertificateWriteParams
  ): Response<Success>;
  deviceReadFactoryCertificate(
    connectId: string,
    params?: CommonParams
  ): Response<DeviceCertificate>;
  deviceSignFactoryChallenge(
    connectId: string,
    params: CommonParams & DeviceFactoryChallengeSignParams
  ): Response<DeviceCertificateSignature>;
  deviceInfoSettings(
    connectId: string,
    params: CommonParams & {
      serial_no?: string;
      cpu_info?: string;
      pre_firmware?: string;
    }
  ): Response<Success>;
  deviceGetInfo(connectId: string, params?: CommonParams): Response<Record<string, unknown>>;
  deviceWriteSEPrivateKey(
    connectId: string,
    params: CommonParams & { private_key?: string }
  ): Response<Success>;
  deviceWriteSEPublicCert(
    connectId: string,
    params: CommonParams & { public_cert?: string }
  ): Response<Success>;
};
