'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BotIcon,
  CopyIcon,
  Loader2Icon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';

const isFeatureEnabled = () => {
  const flag = process.env.NEXT_PUBLIC_DOCS_AI_ENABLED?.trim().toLowerCase();
  return flag !== 'false' && flag !== '0';
};

const resolveApiUrl = () => {
  const rawApiUrl = process.env.NEXT_PUBLIC_DOCS_AI_API_URL?.trim();
  if (!rawApiUrl) return '';

  if (/^https?:\/\//i.test(rawApiUrl)) return rawApiUrl;

  if (rawApiUrl.startsWith('/')) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || '';
    return `${basePath}${rawApiUrl}` || rawApiUrl;
  }

  return rawApiUrl;
};

const resolveLibraryId = () =>
  process.env.NEXT_PUBLIC_DOCS_AI_LIBRARY_ID?.trim() || '/onekeyhq/hardware-js-sdk';

const getWidgetCopy = isZh => {
  if (isZh) {
    return {
      title: 'OneKey 文档助手',
      subtitle: '基于 Context7 的开发者问答',
      fabText: '问 AI',
      openLabel: '打开 AI 助手',
      closeLabel: '关闭 AI 助手',
      placeholder: '输入问题，例如：如何初始化 SDK？',
      sending: '生成中',
      send: '发送',
      stop: '停止',
      copy: '复制',
      copied: '已复制',
      retry: '重试',
      error: '请求失败，请重试。',
      empty: '你好，我是 OneKey Hardware SDK 文档助手。',
      suggestions: [
        {
          text: '如何初始化 SDK？',
          prompt: '如何初始化 OneKey Hardware SDK？请给我最小可运行示例。',
        },
        {
          text: '设备连接排查',
          prompt: '连接设备失败时，常见排查步骤有哪些？',
        },
        {
          text: '签名流程说明',
          prompt: '请解释一次完整的交易签名流程，并给代码示例。',
        },
      ],
    };
  }

  return {
    title: 'OneKey Docs Assistant',
    subtitle: 'Powered by Context7 retrieval',
    fabText: 'Ask AI',
    openLabel: 'Open AI assistant',
    closeLabel: 'Close AI assistant',
    placeholder: 'Ask your question, e.g. How do I connect a device?',
    sending: 'Generating',
    send: 'Send',
    stop: 'Stop',
    copy: 'Copy',
    copied: 'Copied',
    retry: 'Retry',
    error: 'Request failed. Please retry.',
    empty: 'Hi, I am the OneKey Hardware SDK docs assistant.',
    suggestions: [
      {
        text: 'SDK initialization',
        prompt: 'How do I initialize OneKey Hardware SDK with a minimal runnable example?',
      },
      {
        text: 'Connection troubleshooting',
        prompt: 'What are the common troubleshooting steps when device connection fails?',
      },
      {
        text: 'Signing workflow',
        prompt: 'Explain a full transaction signing flow with code examples.',
      },
    ],
  };
};

const getMessageTextParts = message => {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const textParts = parts
    .filter(part => part?.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .filter(Boolean);

  if (textParts.length > 0) return textParts;
  if (typeof message?.content === 'string' && message.content.trim()) {
    return [message.content];
  }

  return [];
};

function MarkdownCodeBlock({ className, children, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="docs-ai-code-block">
      <div className="docs-ai-code-head">
        <span>{language}</span>
        <button
          type="button"
          className="docs-ai-code-copy"
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyLabel}
        >
          <CopyIcon size={14} />
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <pre>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({ text, copy }) {
  return (
    <div className="docs-ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: props => <a {...props} target="_blank" rel="noreferrer noopener" />,
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code {...props} className="docs-ai-inline-code">
                  {children}
                </code>
              );
            }

            return (
              <MarkdownCodeBlock
                className={className}
                copyLabel={copy.copy}
                copiedLabel={copy.copied}
              >
                {children}
              </MarkdownCodeBlock>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ChatWidgetRuntime({ apiUrl, lang }) {
  const pathname = usePathname();
  const isZh = lang === 'zh';
  const copy = useMemo(() => getWidgetCopy(isZh), [isZh]);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');
  const scrollRef = useRef(null);

  const authHeaderName = process.env.NEXT_PUBLIC_DOCS_AI_AUTH_HEADER_NAME?.trim();
  const authHeaderValue = process.env.NEXT_PUBLIC_DOCS_AI_AUTH_HEADER_VALUE?.trim();

  const headers = useMemo(() => {
    if (!authHeaderName || !authHeaderValue) return undefined;
    return {
      [authHeaderName]: authHeaderValue,
    };
  }, [authHeaderName, authHeaderValue]);

  const body = useMemo(
    () => ({
      libraryId: resolveLibraryId(),
      pathname,
      lang,
      source: 'hardware-js-sdk-docs',
    }),
    [pathname, lang]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl,
        credentials: 'omit',
        headers,
        body,
      }),
    [apiUrl, body, headers]
  );

  const { messages, sendMessage, regenerate, stop, status, error, clearError } = useChat({
    transport,
  });

  const isGenerating = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status, isOpen]);

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const handleSend = useCallback(
    async customInput => {
      const text = (customInput ?? input).trim();
      if (!text || isGenerating) return;

      setInput('');
      await sendMessage({ text });
    },
    [input, isGenerating, sendMessage]
  );

  const handleCopyMessage = useCallback(async message => {
    const text = getMessageTextParts(message).join('\n\n').trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(''), 1200);
    } catch {
      setCopiedMessageId('');
    }
  }, []);

  return (
    <div className="docs-ai-root" data-onekey-doc-ai="root">
      {!isOpen ? (
        <button
          type="button"
          className="docs-ai-fab"
          onClick={() => setIsOpen(v => !v)}
          aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        >
          <SparklesIcon size={16} />
          <span className="docs-ai-fab-text">{copy.fabText}</span>
        </button>
      ) : null}

      {isOpen ? (
        <section className="docs-ai-panel" aria-label={copy.title}>
          <header className="docs-ai-header">
            <div className="docs-ai-title-wrap">
              <span className="docs-ai-logo">
                <BotIcon size={14} />
              </span>
              <div>
                <h3>{copy.title}</h3>
                <p>{copy.subtitle}</p>
              </div>
            </div>
            <button type="button" className="docs-ai-close" onClick={() => setIsOpen(false)}>
              <XIcon size={16} />
            </button>
          </header>

          <div className="docs-ai-body" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="docs-ai-empty">
                <p>{copy.empty}</p>
                <div className="docs-ai-suggestion-list">
                  {copy.suggestions.map(item => (
                    <button
                      key={item.text}
                      type="button"
                      className="docs-ai-suggestion"
                      onClick={() => handleSend(item.prompt)}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map(message => {
              const textParts = getMessageTextParts(message);
              if (textParts.length === 0) return null;

              const isAssistant = message.role === 'assistant';

              return (
                <article
                  key={message.id}
                  className={`docs-ai-message ${isAssistant ? 'is-assistant' : 'is-user'}`}
                >
                  {isAssistant ? <span className="docs-ai-avatar">A</span> : null}
                  <div className="docs-ai-bubble">
                    {textParts.map((part, index) => (
                      <MarkdownMessage key={`${message.id}-${index}`} text={part} copy={copy} />
                    ))}

                    {isAssistant ? (
                      <div className="docs-ai-actions">
                        <button type="button" onClick={() => handleCopyMessage(message)}>
                          <CopyIcon size={14} />
                          <span>
                            {copiedMessageId === message.id ? copy.copied : copy.copy}
                          </span>
                        </button>
                        {latestAssistantMessage?.id === message.id ? (
                          <button type="button" onClick={() => regenerate({ messageId: message.id })}>
                            <RotateCcwIcon size={14} />
                            <span>{copy.retry}</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {isGenerating ? (
              <div className="docs-ai-status">
                <Loader2Icon size={14} className="spin" />
                <span>{copy.sending}</span>
              </div>
            ) : null}

            {error ? (
              <div className="docs-ai-error">
                <span>{copy.error}</span>
                <button type="button" onClick={clearError}>
                  OK
                </button>
              </div>
            ) : null}
          </div>

          <footer className="docs-ai-footer">
            <div className="docs-ai-input-wrap">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                className="docs-ai-input"
                placeholder={copy.placeholder}
                rows={1}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              {isGenerating ? (
                <button
                  type="button"
                  className="docs-ai-send is-stop"
                  onClick={stop}
                  aria-label={copy.stop}
                >
                  <SquareIcon size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="docs-ai-send"
                  onClick={() => handleSend()}
                  aria-label={copy.send}
                  disabled={!input.trim()}
                >
                  <SendIcon size={15} />
                </button>
              )}
            </div>
          </footer>
        </section>
      ) : null}
    </div>
  );
}

export default function DocAIChatWidget({ lang = 'en' }) {
  const enabled = isFeatureEnabled();
  const apiUrl = resolveApiUrl();

  if (!enabled || !apiUrl) {
    return null;
  }

  return <ChatWidgetRuntime apiUrl={apiUrl} lang={lang} />;
}
