import { getHDPath, getScriptType } from '@onekeyfe/hd-core';
import { logHardware, logError } from '../utils/logger';

// 预览并记录即将传给硬件的关键参数（不改变原始 params）
export function previewHardwareParams(method: string, params: Record<string, unknown>) {
  try {
    const p = params as Record<string, unknown>;

    // 通用提取：address_n（接受 path 字符串/数组 或 address_n 数组）
    const preview: Record<string, unknown> = {};
    if (Array.isArray(p.address_n)) {
      preview.address_n = p.address_n;
    } else if (typeof p.path === 'string') {
      try {
        preview.address_n = getHDPath(p.path);
      } catch {
        preview.address_n = p.path;
      }
    } else if (Array.isArray(p.path)) {
      preview.address_n = p.path;
    }

    // 通用提取：coin_name / chain_id / coin
    if (p.coin_name || p.coin) preview.coin_name = p.coin_name ?? p.coin;
    if (p.chain_id !== undefined) preview.chain_id = p.chain_id;

    // 通用：脚本类型与关闭标志（兼容大小写）
    if (p.script_type !== undefined) {
      preview.script_type = p.script_type;
    } else if (Array.isArray(preview.address_n)) {
      try {
        preview.script_type = getScriptType(preview.address_n as number[]);
      } catch {
        // Ignore script type extraction errors
      }
    }
    if (p.noScriptType !== undefined) preview.no_script_type = p.noScriptType;
    if (p.no_script_type !== undefined) preview.no_script_type = p.no_script_type;

    // 通用：消息/数据（只展示安全摘要，避免日志过大）
    const msg = p.messageHex ?? p.message ?? p.msg ?? p.data;
    if (typeof msg === 'string') {
      const s = msg.replace(/^0x/i, '');
      preview.message = s.length > 64 ? `${s.slice(0, 64)}... (len=${s.length})` : s;
    } else if (typeof msg === 'object' && msg) {
      preview.message_summary = {
        keys: Object.keys(msg).slice(0, 10),
        size: JSON.stringify(msg).length,
      };
    }

    // 通用：交易核心字段（EVM/SOL/其他链尽量兼容）
    const tx = p.rawTx ?? p.tx ?? p.transaction;
    if (typeof tx === 'string') {
      const s = tx.replace(/^0x/i, '');
      preview.rawTx = s.length > 64 ? `${s.slice(0, 64)}... (len=${s.length})` : s;
    } else if (typeof tx === 'object' && tx) {
      preview.tx_summary = {
        keys: Object.keys(tx).slice(0, 15),
        size: JSON.stringify(tx).length,
      };
    }

    // 其他通用易读字段（如果存在）
    ['to','value','gas','gasPrice','maxFeePerGas','maxPriorityFeePerGas','nonce','type',
     'message_version','message_format','application_domain','pubkey','public_key']
      .forEach(k => {
        if (p[k] !== undefined) preview[k] = p[k];
      });

    logHardware(`Preview hardware params for ${method}`, preview);
  } catch (e) {
    logError('Failed to preview hardware params', { error: e });
  }
}

