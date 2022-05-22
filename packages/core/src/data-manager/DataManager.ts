import * as config from '../data/config.json';
import { httpRequest } from '../utils';
import { parseBridgeJSON } from './transportInfo';

type AssetCollection = { [key: string]: JSON };

export default class DataManager {
  static assets: AssetCollection = {};

  // TODO: settings 类型补全
  static settings: any;

  static messages: { [key: string]: JSON } = {};

  static async load(settings: any, withAssets = true) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const ts = `?r=${settings.timestamp}`;
    this.settings = settings;

    if (!withAssets) return;

    const assetPromises = config.assets.map(async asset => {
      const json = await httpRequest(`${asset.url}${ts}`, 'json');
      this.assets[asset.name] = json;
    });
    await Promise.all(assetPromises);

    const protobufPromises = config.messages.map(async protobuf => {
      const json = await httpRequest(`${protobuf.json}${ts}`, 'json');
      this.messages[protobuf.name] = json;
    });
    await Promise.all(protobufPromises);

    // parse bridge JSON
    parseBridgeJSON(this.assets.bridge);
  }

  static getProtobufMessages() {
    return this.messages.default;
  }
}
