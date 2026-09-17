import { UI_REQUEST, UI_RESPONSE } from '../events/ui-request';
import { HardwareErrorCode } from '../types/errors';
import { UiRequestRegistry } from '../utils/UiRequestRegistry';

describe('UiRequestRegistry selection correlation', () => {
  it('ignores stale and uncorrelated responses, including cancellation', async () => {
    const registry = new UiRequestRegistry();
    const requestId = registry.createRequestId();
    const pending = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE, { requestId });
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, { sdkConnectId: 'old' });
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, {
      requestId: 'stale',
      cancelled: true,
    });
    expect(registry.hasPending(UI_REQUEST.REQUEST_SELECT_DEVICE)).toBe(true);
    const response = { requestId, sdkConnectId: 'selected' };
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, response);
    await expect(pending).resolves.toEqual(response);
    expect(registry.hasPending()).toBe(false);
  });

  it('cancels only the matching selection as UserAborted', async () => {
    const registry = new UiRequestRegistry();
    const requestId = registry.createRequestId();
    const pending = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE, { requestId });
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, { requestId, cancelled: true });
    await expect(pending).rejects.toMatchObject({ code: HardwareErrorCode.UserAborted });
    expect(registry.hasPending()).toBe(false);
  });

  it('does not let the superseded dialog settle its replacement', async () => {
    const registry = new UiRequestRegistry();
    const oldId = registry.createRequestId();
    const oldRequest = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE, { requestId: oldId });
    const oldRejection = expect(oldRequest).rejects.toMatchObject({ _tag: 'UiRequestPreempted' });
    const requestId = registry.createRequestId();
    expect(requestId).not.toBe(oldId);
    const current = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE, { requestId });
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, { requestId: oldId, cancelled: true });
    expect(registry.hasPending()).toBe(true);
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, { requestId, sdkConnectId: 'new' });
    await oldRejection;
    await expect(current).resolves.toMatchObject({ sdkConnectId: 'new' });
  });

  it('preserves legacy untagged UI requests', async () => {
    const registry = new UiRequestRegistry();
    const pending = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE);
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, { sdkConnectId: 'legacy' });
    await expect(pending).resolves.toEqual({ sdkConnectId: 'legacy' });
  });
});
