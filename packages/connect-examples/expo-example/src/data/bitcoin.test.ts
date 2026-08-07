/**
 * Bitcoin Transaction Generator for Jest Tests
 * 简单的比特币交易生成器，用于Jest测试
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 生成比特币交易的refTx格式
 * @param outputCount 输出数量
 * @param scriptPubkey 脚本公钥（hex格式）
 * @param outputAmount 每个输出的金额（satoshi，默认10000）
 * @returns refTx格式的交易对象
 */
export function generateRefTx(outputCount: number, scriptPubkey: string, outputAmount = 10000) {
  // Mock input - 随机生成前一个交易
  const mockInputTxHash = crypto.randomBytes(32).reverse().toString('hex');
  const mockInputIndex = 400;
  const mockInputAmount = outputCount * outputAmount + 50000; // 确保有足够的输入金额

  // 使用Transaction类直接构建交易
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.locktime = 0;

  // 添加输入
  tx.addInput(Buffer.from(mockInputTxHash, 'hex').reverse(), mockInputIndex);

  // 创建指定数量的输出
  const targetScriptPubkey = Buffer.from(scriptPubkey, 'hex');
  for (let i = 0; i < outputCount; i++) {
    tx.addOutput(targetScriptPubkey, outputAmount);
  }

  // 添加找零输出（剩余金额）
  const totalOutputAmount = outputCount * outputAmount;
  const fee = Math.max(1000, Math.floor(outputCount / 10)); // 动态手续费
  const changeAmount = mockInputAmount - totalOutputAmount - fee;

  if (changeAmount > 0) {
    // 创建找零脚本 (P2PKH格式)
    const randomHash = crypto.randomBytes(20);
    const changeScript = Buffer.concat([
      // @ts-ignore
      Buffer.from([0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 <20 bytes>
      // @ts-ignore
      randomHash,
      // @ts-ignore
      Buffer.from([0x88, 0xac]), // OP_EQUALVERIFY OP_CHECKSIG
    ]);
    tx.addOutput(changeScript, changeAmount);
  }

  // 空的签名脚本（模拟未签名状态）
  tx.ins[0].script = Buffer.alloc(0);

  // 计算交易哈希
  const txHash = tx.getId();

  // 返回refTx格式
  return {
    hash: txHash,
    version: tx.version,
    inputs: [
      {
        prev_hash: mockInputTxHash,
        prev_index: mockInputIndex,
        script_sig: '',
        sequence: tx.ins[0].sequence,
      },
    ],
    bin_outputs: tx.outs.map(output => ({
      amount: output.value,
      script_pubkey: output.script.toString('hex'),
    })),
    lock_time: tx.locktime,
  };
}

// Jest 测试用例
describe('Bitcoin RefTx Generator', () => {
  test('生成200个输出的交易', () => {
    const scriptPubkey = `76a9144e20ec718604a211629e42fbe37dda3576bfcd8b88ac`; // P2PKH zero address
    const outputSize = 500;
    const refTx = generateRefTx(outputSize, scriptPubkey);

    expect(refTx.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(refTx.version).toBe(2);
    expect(refTx.lock_time).toBe(0);
    expect(refTx.inputs).toHaveLength(1);
    expect(refTx.bin_outputs).toHaveLength(outputSize + 1); // 200 + 1 找零

    // 验证前200个输出都是指定的scriptPubkey
    for (let i = 0; i < outputSize; i++) {
      expect(refTx.bin_outputs[i].amount).toBe(10000);
      expect(refTx.bin_outputs[i].script_pubkey).toBe(scriptPubkey);
    }

    // 最后一个是找零输出
    expect(refTx.bin_outputs[outputSize].amount).toBeGreaterThan(0);
    expect(refTx.bin_outputs[outputSize].script_pubkey).toMatch(/^76a914[0-9a-f]{40}88ac$/);

    // 输出到 output.json 文件
    const outputPath = path.join(__dirname, 'output.json');
    fs.writeFileSync(outputPath, JSON.stringify(refTx, null, 2));
    console.log(`完整的 refTx 已保存到: ${outputPath}`);
  });
});
