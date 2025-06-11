import { HardwareApiMethod } from "~/services/hardwareService";

export interface PresupposeProps {
  title: string;
  value: Record<string, unknown>;
}

export interface MethodPayload {
  method: HardwareApiMethod;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
}

export type PlaygroundProps = {
  description: string;
  presupposes?: PresupposeProps[];
  deprecated?: boolean;
} & MethodPayload;
