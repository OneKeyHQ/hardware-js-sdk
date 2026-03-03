import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { URL } from 'node:url';

const DEFAULT_CONTEXT7_CHAT_ENDPOINT = 'https://context7.com/api/v2/chat';
const DEFAULT_CONTEXT7_CONTEXT_ENDPOINT = 'https://context7.com/api/v2/context';
const DEFAULT_LIBRARY_ID = '/onekeyhq/hardware-js-sdk';
const ROOT_CONTEXT7_JSON = new URL('../../../../context7.json', import.meta.url);

const PORT = Number(process.env.PORT || 8787);
const MODE = (process.env.CONTEXT7_GATEWAY_MODE || 'auto').trim().toLowerCase();
const CONTEXT7_CHAT_ENDPOINT =
  process.env.CONTEXT7_CHAT_ENDPOINT?.trim() || DEFAULT_CONTEXT7_CHAT_ENDPOINT;
const CONTEXT7_CONTEXT_ENDPOINT =
  process.env.CONTEXT7_CONTEXT_ENDPOINT?.trim() || DEFAULT_CONTEXT7_CONTEXT_ENDPOINT;
const CONTEXT7_API_KEY = process.env.CONTEXT7_API_KEY?.trim() || '';

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveLibraryConfig() {
  const fromEnv = process.env.CONTEXT7_LIBRARY_ID?.trim();
  if (fromEnv) {
    return {
      libraryId: fromEnv,
      publicKey: process.env.CONTEXT7_PUBLIC_KEY?.trim() || '',
      source: 'env',
    };
  }

  if (!existsSync(ROOT_CONTEXT7_JSON)) {
    return { libraryId: DEFAULT_LIBRARY_ID, publicKey: '', source: 'default' };
  }

  const parsed = safeJsonParse(readFileSync(ROOT_CONTEXT7_JSON, 'utf8'));
  if (!parsed || typeof parsed !== 'object') {
    return { libraryId: DEFAULT_LIBRARY_ID, publicKey: '', source: 'default' };
  }

  let libraryId = DEFAULT_LIBRARY_ID;
  if (typeof parsed.url === 'string') {
    try {
      const pathname = new URL(parsed.url).pathname.replace(/\/+$/, '');
      if (/^\/[^/]+\/[^/]+/.test(pathname)) {
        libraryId = pathname;
      }
    } catch {
      libraryId = DEFAULT_LIBRARY_ID;
    }
  }

  return {
    libraryId,
    publicKey: typeof parsed.public_key === 'string' ? parsed.public_key : '',
    source: 'context7.json',
  };
}

const libraryConfig = resolveLibraryConfig();

function createHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...extra,
  };

  if (CONTEXT7_API_KEY) {
    headers.Authorization = `Bearer ${CONTEXT7_API_KEY}`;
  }

  return headers;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Context7-Public-Key'
  );
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function writeSSE(res, chunk) {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

function beginSSE(res) {
  setCorsHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
}

function splitText(text, size = 80) {
  if (!text) return [];
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function streamPlainText(res, text) {
  beginSSE(res);

  const messageId = randomUUID();
  const textId = '0';

  writeSSE(res, { type: 'start', messageId });
  writeSSE(res, { type: 'start-step' });
  writeSSE(res, { type: 'text-start', id: textId });
  for (const delta of splitText(text, 80)) {
    writeSSE(res, { type: 'text-delta', id: textId, delta });
  }
  writeSSE(res, { type: 'text-end', id: textId });
  writeSSE(res, { type: 'finish-step' });
  writeSSE(res, { type: 'finish', finishReason: 'stop' });
  res.end();
}

function streamError(res, message) {
  beginSSE(res);
  writeSSE(res, { type: 'start', messageId: randomUUID() });
  writeSSE(res, { type: 'error', errorText: message });
  writeSSE(res, { type: 'finish', finishReason: 'error' });
  res.end();
}

function truncate(text, max = 320) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function latestUserQuery(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== 'user') continue;

    if (typeof message.content === 'string' && message.content.trim()) {
      return message.content.trim();
    }

    if (Array.isArray(message.parts)) {
      const textPart = message.parts.find(
        part => part && part.type === 'text' && typeof part.text === 'string' && part.text.trim()
      );
      if (textPart?.text) return textPart.text.trim();
    }
  }
  return '';
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter(Boolean).slice(-20);
}

function renderContextAnswer({
  libraryId,
  pathname,
  lang,
  query,
  contextData,
}) {
  const infoSnippets = Array.isArray(contextData?.infoSnippets)
    ? contextData.infoSnippets.slice(0, 3)
    : [];
  const codeSnippets = Array.isArray(contextData?.codeSnippets)
    ? contextData.codeSnippets.slice(0, 2)
    : [];

  const lines = [];
  lines.push(`已通过 Context7 检索文档（库：\`${libraryId}\`）。`);
  if (query) lines.push(`问题：${query}`);
  if (pathname) lines.push(`当前文档路径：${pathname}`);
  if (lang) lines.push(`语言：${lang}`);
  lines.push('');

  if (infoSnippets.length > 0) {
    lines.push('### 文档摘要');
    infoSnippets.forEach((item, index) => {
      const title = item?.breadcrumb || item?.pageId || `片段 ${index + 1}`;
      const content = truncate(item?.content || '', 420);
      lines.push(`${index + 1}. **${title}**`);
      if (content) lines.push(`   ${content}`);
    });
    lines.push('');
  }

  if (codeSnippets.length > 0) {
    lines.push('### 代码示例');
    codeSnippets.forEach((item, index) => {
      const title = item?.codeTitle || item?.pageTitle || `示例 ${index + 1}`;
      const code = item?.codeList?.[0]?.code || '';
      const language = item?.codeList?.[0]?.language || item?.codeLanguage || 'text';
      lines.push(`${index + 1}. **${title}**`);
      if (code) {
        lines.push(`\`\`\`${language}`);
        lines.push(truncate(code, 1000));
        lines.push('```');
      }
      if (item?.codeId) lines.push(`来源：${item.codeId}`);
    });
    lines.push('');
  }

  if (lines.length <= 5) {
    lines.push('没有检索到足够的上下文，请尝试更具体的问题。');
  } else {
    lines.push('如果你愿意，我可以继续基于这个问题给你一个更贴近当前页面的步骤化答案。');
  }

  return lines.join('\n');
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString();
  }
  if (!raw) return {};
  const data = safeJsonParse(raw);
  if (!data || typeof data !== 'object') {
    throw new Error('请求体不是合法 JSON。');
  }
  return data;
}

async function openContext7ChatStream({ messages, libraryId }) {
  const payload = {
    messages,
    libraryName: libraryId,
  };

  const headers = createHeaders({
    Accept: 'text/event-stream',
    'X-Context7-Public-Key': libraryConfig.publicKey || '',
  });

  const response = await fetch(CONTEXT7_CHAT_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `Context7 Chat 请求失败（${response.status} ${response.statusText}）${bodyText ? `: ${truncate(bodyText, 180)}` : ''}`
    );
  }

  return response;
}

async function fetchContext7Context({ libraryId, query }) {
  const url = new URL(CONTEXT7_CONTEXT_ENDPOINT);
  url.searchParams.set('libraryId', libraryId);
  url.searchParams.set('query', query || 'overview');
  url.searchParams.set('type', 'json');

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      Accept: 'application/json',
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `Context7 Context 请求失败（${response.status} ${response.statusText}）${bodyText ? `: ${truncate(bodyText, 180)}` : ''}`
    );
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw new Error('Context7 Context 响应格式异常。');
  }
  return data;
}

async function pipeUpstreamSSE(upstream, res) {
  beginSSE(res);
  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        res.write(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (method === 'OPTIONS') {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        mode: MODE,
        libraryId: libraryConfig.libraryId,
        hasContext7ApiKey: Boolean(CONTEXT7_API_KEY),
        context7ChatEndpoint: CONTEXT7_CHAT_ENDPOINT,
        context7ContextEndpoint: CONTEXT7_CONTEXT_ENDPOINT,
      });
      return;
    }

    if (method !== 'POST' || url.pathname !== '/api/chat') {
      sendJson(res, 404, {
        error: 'Not Found',
        message: '仅支持 POST /api/chat 与 GET /health',
      });
      return;
    }

    const body = await readBody(req);
    const messages = normalizeMessages(body.messages);
    const libraryId =
      (typeof body.libraryId === 'string' && body.libraryId.trim()) || libraryConfig.libraryId;
    const pathname = typeof body.pathname === 'string' ? body.pathname : '';
    const lang = typeof body.lang === 'string' ? body.lang : '';
    const query = latestUserQuery(messages);

    if (MODE === 'chat') {
      const upstream = await openContext7ChatStream({ messages, libraryId });
      await pipeUpstreamSSE(upstream, res);
      return;
    }

    if (MODE === 'context') {
      const contextData = await fetchContext7Context({ libraryId, query });
      const answer = renderContextAnswer({
        libraryId,
        pathname,
        lang,
        query,
        contextData,
      });
      streamPlainText(res, answer);
      return;
    }

    try {
      const upstream = await openContext7ChatStream({ messages, libraryId });
      await pipeUpstreamSSE(upstream, res);
      return;
    } catch (chatError) {
      const contextData = await fetchContext7Context({ libraryId, query });
      const answer = renderContextAnswer({
        libraryId,
        pathname,
        lang,
        query,
        contextData,
      });
      streamPlainText(
        res,
        `${answer}\n\n---\n注：Chat 直连失败，已自动降级为 Context 检索模式。`
      );
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    streamError(res, message);
  }
});

server.listen(PORT, () => {
  const maskedPublicKey = libraryConfig.publicKey
    ? `${libraryConfig.publicKey.slice(0, 6)}***`
    : '(none)';
  console.log(
    `[context7-gateway] listening on http://localhost:${PORT}\n` +
      `  mode: ${MODE}\n` +
      `  libraryId: ${libraryConfig.libraryId} (${libraryConfig.source})\n` +
      `  has CONTEXT7_API_KEY: ${Boolean(CONTEXT7_API_KEY)}\n` +
      `  context7 public_key: ${maskedPublicKey}\n` +
      `  chat endpoint: ${CONTEXT7_CHAT_ENDPOINT}\n` +
      `  context endpoint: ${CONTEXT7_CONTEXT_ENDPOINT}\n`
  );
});
