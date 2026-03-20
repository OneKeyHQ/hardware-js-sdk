import type { ConnectionState, TestCaseResult } from '../../services/phonePilotMcp/types';

export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getStatusColor(
  status: 'passed' | 'failed' | 'skipped' | 'idle' | 'running'
): string {
  if (status === 'passed') {
    return '$green10';
  }
  if (status === 'failed') {
    return '$red10';
  }
  if (status === 'skipped') {
    return '$gray10';
  }
  return '$blue10';
}

export function getConnectionColor(connectionState: ConnectionState): string {
  if (connectionState === 'connected') {
    return getStatusColor('passed');
  }
  if (connectionState === 'error') {
    return getStatusColor('failed');
  }
  return getStatusColor('running');
}

export function getReadyColor(ready: boolean | null | undefined): string {
  if (ready === true) {
    return getStatusColor('passed');
  }
  if (ready === false) {
    return getStatusColor('failed');
  }
  return getStatusColor('running');
}

export function formatReadyLabel(ready: boolean | null | undefined): string {
  if (ready === true) {
    return 'ready';
  }
  if (ready === false) {
    return 'not ready';
  }
  return '未检测';
}

export function getCaseStatusIcon(testCase: TestCaseResult): string {
  if (testCase.skipped) {
    return '⏭️';
  }
  if (testCase.passed) {
    return '✅';
  }
  return '❌';
}
