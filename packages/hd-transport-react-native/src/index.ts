import transport from '@onekeyfe/hd-transport';

const { check, buildOne, receiveOne, parseConfigure } = transport;

export default class ReactNativeTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  stopped = false;

  init() {
    // empty
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {
    // empty
  }
}
