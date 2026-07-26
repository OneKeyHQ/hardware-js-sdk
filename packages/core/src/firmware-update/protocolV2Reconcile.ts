import { FirmwareUpdateErrorCode, createFirmwareUpdateError } from './errors';
import {
  ProtocolV2FirmwareUpdateStatus,
  getProtocolV2FirmwareTargetDescriptor,
  getProtocolV2FirmwareTargetDescriptorById,
  normalizeProtocolV2FirmwareTargetId,
  normalizeProtocolV2FirmwareUpdateStatus,
  protocolV2PackedVersionToString,
  resolveProtocolV2FirmwareStagingPath,
} from '../protocols/protocol-v2/firmware';

import type { FirmwareTarget, FirmwareUpdateEpoch } from './contracts';

export interface ProtocolV2FirmwareUpdateRecord {
  target_id: number | string;
  status?: number | string;
  payload_version?: number;
  path?: string;
}

export interface ProtocolV2TargetInstallStatus {
  target: FirmwareTarget;
  status: 'pending' | 'installing' | 'finished';
  payloadVersion?: string;
}

export interface ProtocolV2InstallReconciliation {
  decision: 'idle' | 'attach' | 'finished';
  pendingInstall: boolean;
  versions: Readonly<Partial<Record<FirmwareTarget, string>>>;
  targets: readonly ProtocolV2TargetInstallStatus[];
}

const transactionConflict = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwareTransactionConflict, detail, {
    detail,
  });
};

const isInstallEpoch = (epoch: FirmwareUpdateEpoch) =>
  epoch.kind === 'bootloader-install' || epoch.kind === 'component-install';

const targetStatusLabel = (status: number): ProtocolV2TargetInstallStatus['status'] => {
  if (status === ProtocolV2FirmwareUpdateStatus.PENDING) {
    return 'pending';
  }
  if (status === ProtocolV2FirmwareUpdateStatus.IN_PROGRESS) {
    return 'installing';
  }
  if (status === ProtocolV2FirmwareUpdateStatus.FINISHED) {
    return 'finished';
  }
  return transactionConflict(`Protocol V2 install failed with status ${status}`);
};

export const buildProtocolV2InstallTargets = (
  epoch: FirmwareUpdateEpoch
): Array<{ target_id: number; path: string }> => {
  if (!isInstallEpoch(epoch)) {
    return transactionConflict(`Protocol V2 epoch ${epoch.epochId} is not installable`);
  }
  return epoch.targetIds.map(target => ({
    target_id: getProtocolV2FirmwareTargetDescriptor(target).targetId,
    path: resolveProtocolV2FirmwareStagingPath(target),
  }));
};

export const reconcileProtocolV2InstallRecords = ({
  epoch,
  records,
}: {
  epoch: FirmwareUpdateEpoch;
  records: readonly ProtocolV2FirmwareUpdateRecord[];
}): ProtocolV2InstallReconciliation => {
  const expectedTargets = buildProtocolV2InstallTargets(epoch);
  const expectedById = new Map(expectedTargets.map(target => [target.target_id, target]));
  const recordsById = new Map<number, ProtocolV2FirmwareUpdateRecord>();

  for (const record of records) {
    const targetId = normalizeProtocolV2FirmwareTargetId(record.target_id);
    const status = normalizeProtocolV2FirmwareUpdateStatus(record.status);
    if (targetId === undefined) {
      if (status !== ProtocolV2FirmwareUpdateStatus.FINISHED) {
        transactionConflict(
          `Protocol V2 has an active unsupported firmware target: ${record.target_id}`
        );
      }
    } else if (!expectedById.has(targetId)) {
      if (status !== ProtocolV2FirmwareUpdateStatus.FINISHED) {
        const descriptor = getProtocolV2FirmwareTargetDescriptorById(targetId);
        transactionConflict(
          `Protocol V2 has an active target outside epoch ${epoch.epochId}: ${
            descriptor?.target ?? targetId
          }`
        );
      }
    } else {
      if (recordsById.has(targetId)) {
        transactionConflict(`Protocol V2 returned duplicate status records for target ${targetId}`);
      }
      recordsById.set(targetId, record);
    }
  }

  if (recordsById.size === 0) {
    return {
      decision: 'idle',
      pendingInstall: false,
      versions: {},
      targets: [],
    };
  }
  if (recordsById.size !== expectedById.size) {
    transactionConflict(
      `Protocol V2 status records do not cover every target in epoch ${epoch.epochId}`
    );
  }

  const versions: Partial<Record<FirmwareTarget, string>> = {};
  const targets: ProtocolV2TargetInstallStatus[] = [];
  for (const expected of expectedTargets) {
    const record = recordsById.get(expected.target_id);
    if (!record) {
      return transactionConflict(
        `Protocol V2 status is missing target ${expected.target_id} in epoch ${epoch.epochId}`
      );
    }
    if (record.path !== expected.path) {
      return transactionConflict(
        `Protocol V2 target ${expected.target_id} path conflicts with the prepared plan`
      );
    }
    const status = normalizeProtocolV2FirmwareUpdateStatus(record.status);
    if (status === undefined) {
      return transactionConflict(
        `Protocol V2 target ${expected.target_id} has an unknown install status`
      );
    }
    const descriptor = getProtocolV2FirmwareTargetDescriptorById(expected.target_id);
    if (!descriptor) {
      return transactionConflict(`Protocol V2 target ${expected.target_id} is unsupported`);
    }
    const payloadVersion =
      typeof record.payload_version === 'number' && Number.isSafeInteger(record.payload_version)
        ? protocolV2PackedVersionToString(record.payload_version)
        : undefined;
    if (payloadVersion) {
      versions[descriptor.target] = payloadVersion;
    }
    targets.push({
      target: descriptor.target,
      status: targetStatusLabel(status),
      ...(payloadVersion ? { payloadVersion } : {}),
    });
  }

  const finished = targets.every(target => target.status === 'finished');
  return {
    decision: finished ? 'finished' : 'attach',
    pendingInstall: !finished,
    versions,
    targets,
  };
};
