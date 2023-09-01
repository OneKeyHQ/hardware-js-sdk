import { UI_RESPONSE } from './ui-response';

export const LogBlockEvent: Set<string> = new Set([
  UI_RESPONSE.RECEIVE_PIN,
  UI_RESPONSE.RECEIVE_PASSPHRASE,
]);
