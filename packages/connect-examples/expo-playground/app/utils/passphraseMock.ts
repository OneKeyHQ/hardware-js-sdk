/**
 * 临时调试开关：expo-playground 统一使用固定的隐藏钱包 Passphrase。
 *
 * 当前 Pro2 eventless wallet session 仍在联调，playground 暂不验证标准钱包路径。
 * 完成真实钱包选择流程后，应删除此开关并恢复 PassphraseDialog。
 */
export const PLAYGROUND_MOCK_HIDDEN_WALLET = true;

/** 仅用于本地 playground 的公开测试值，禁止用于正式钱包或生产环境。 */
export const PLAYGROUND_MOCK_PASSPHRASE = 'expo-playground-mock-hidden-wallet';
