/**
 * iOS reports a bond the device no longer holds as CBErrorPeerRemovedPairingInformation, but not
 * on every iPhone. On the iPhone 17 family the device ends the link about a second after
 * connecting instead (its firmware drops a link on the second key failure), and the app only sees
 * CBErrorPeripheralDisconnected on whatever operation was in flight. The disconnect event carries
 * no reason on iOS, so that error is the only place the code appears.
 *
 * A device that powers off or reboots right after connecting ends one link the same way, so a
 * single drop proves nothing. iOS never re-pairs on its own, which makes a stale bond end every
 * new link like that: two acquire attempts in a row, each dropped by the peer on a link it had
 * just opened and before any response, is what this classifies as a stale bond.
 */

/** CBError.peripheralDisconnected: the peer ended the link. A link timeout is a different code. */
const IOS_PERIPHERAL_DISCONNECTED = 7;

/** The device drops a stale bond about a second after connecting; later drops mean something else. */
export const IOS_PEER_TERMINATION_LINK_WINDOW_MS = 10_000;
/** How long one dropped link stays usable as evidence for the next attempt. */
export const IOS_PEER_TERMINATION_REPEAT_WINDOW_MS = 60_000;

export const isIosPeerTerminationError = (error: unknown): boolean =>
  (error as { iosErrorCode?: unknown } | null | undefined)?.iosErrorCode ===
  IOS_PERIPHERAL_DISCONNECTED;

export class IosPeerTerminationTracker {
  /** When the current acquire attempt opened its link; unset when it reuses an older one. */
  private linkStartedAt = new Map<string, number>();

  /** When the peer ended the current attempt's link. */
  private terminatedAt = new Map<string, number>();

  /** When the previous attempt ended that way. */
  private evidenceAt = new Map<string, number>();

  attemptStarted(deviceId: string) {
    this.linkStartedAt.delete(deviceId);
    this.terminatedAt.delete(deviceId);
  }

  linkStarted(deviceId: string) {
    this.linkStartedAt.set(deviceId, Date.now());
    this.terminatedAt.delete(deviceId);
  }

  /** Reads the native error of a failed operation before it is mapped to a typed one. */
  note(deviceId: string, error: unknown) {
    if (!isIosPeerTerminationError(error)) return;
    if (!this.terminatedAt.has(deviceId)) this.terminatedAt.set(deviceId, Date.now());
  }

  /** The device answered on this link, so its bond is valid. */
  linkProven(deviceId: string) {
    this.forget(deviceId);
  }

  forget(deviceId: string) {
    this.linkStartedAt.delete(deviceId);
    this.terminatedAt.delete(deviceId);
    this.evidenceAt.delete(deviceId);
  }

  /** Returns true when this failed attempt is the second in a row the peer ended on a new link. */
  attemptFailed(deviceId: string): boolean {
    const startedAt = this.linkStartedAt.get(deviceId);
    const terminatedAt = this.terminatedAt.get(deviceId);
    const previous = this.evidenceAt.get(deviceId);
    this.forget(deviceId);

    if (
      startedAt === undefined ||
      terminatedAt === undefined ||
      terminatedAt - startedAt > IOS_PEER_TERMINATION_LINK_WINDOW_MS
    ) {
      return false;
    }
    if (
      previous !== undefined &&
      terminatedAt - previous <= IOS_PEER_TERMINATION_REPEAT_WINDOW_MS
    ) {
      return true;
    }
    this.evidenceAt.set(deviceId, terminatedAt);
    return false;
  }

  reset() {
    this.linkStartedAt.clear();
    this.terminatedAt.clear();
    this.evidenceAt.clear();
  }
}
