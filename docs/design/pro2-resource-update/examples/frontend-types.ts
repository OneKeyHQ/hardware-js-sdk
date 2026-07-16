/**
 * SDK 公共类型建议示例，不是当前可直接编译的实现。
 * 前端只接触逻辑资源分组，不接触设备文件系统路径。
 */

export type ResourceUpdatePhase =
  | 'resolvingRelease'
  | 'planning'
  | 'downloading'
  | 'transferring'
  | 'verifying'
  | 'committing'
  | 'rebooting'
  | 'healthChecking'
  | 'completed'
  | 'rolledBack';

export type ResourceUpdateGroup =
  | 'interface'
  | 'language'
  | 'font'
  | 'animation'
  | 'wallpaper'
  | 'boot'
  | 'other';

export type ResourceUpdateGroupStatus =
  | 'upToDate'
  | 'waiting'
  | 'downloading'
  | 'transferring'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ResourceUpdateGroupProgress {
  group: ResourceUpdateGroup;
  status: ResourceUpdateGroupStatus;
  artifactCount: number;
  completedArtifactCount: number;
  transferBytes: number;
  transferredBytes: number;
}

export interface ResourceUpdatePlanSummary {
  releaseId: string;
  displayVersion?: string;
  fullReleaseBytes: number;
  requiredTransferBytes: number;
  reusedBytes: number;
  rebootRequired: boolean;
  groups: ResourceUpdateGroupProgress[];
}

export interface ResourceUpdateProgressEvent {
  releaseId: string;
  phase: ResourceUpdatePhase;
  progress: number;
  currentGroup?: ResourceUpdateGroup;
  currentArtifactId?: string;
  transferredBytes: number;
  requiredTransferBytes: number;
  reusedBytes: number;
  transferSpeedKBps?: string;
  groups: ResourceUpdateGroupProgress[];
}

export interface ResourceUpdateResult {
  releaseId: string;
  previousReleaseId?: string;
  status: 'completed' | 'rolledBack';
  transferredBytes: number;
  reusedBytes: number;
  rebooted: boolean;
}

export interface ResourceUpdateParams {
  platform: 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';
  channel?: 'stable' | 'beta' | 'internal';
  forced?: boolean;
}

// 前端不传资源版本、URL、设备路径或资源文件列表。
declare function resourceUpdate(
  connectId: string | undefined,
  params: ResourceUpdateParams
): Promise<ResourceUpdateResult>;

void resourceUpdate;
