'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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
import MarkdownMessage from './DocAIMarkdownMessage';
import styles from './DocAIChatWidget.module.css';

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
      title: '问 AI',
      assistantLabel: 'AI 助手',
      greeting: '你好！',
      descriptionLines: [
        '我是基于文档训练的 AI 助手，可回答 SDK 使用与排障问题。',
        '我会结合 OneKey Hardware SDK 文档给出可执行建议。',
      ],
      askAnything: '你可以问我任何有关 OneKey Hardware SDK 的问题。',
      exampleQuestionsTitle: '示例问题',
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
      poweredBy: 'Powered by OneKey',
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
    title: 'Ask AI',
    assistantLabel: 'AI assistant',
    greeting: 'Hi!',
    descriptionLines: [
      "I'm an AI assistant trained on documentation, help articles, and examples.",
      'I answer based on the OneKey Hardware SDK docs and best practices.',
    ],
    askAnything: 'Ask me anything about OneKey Hardware SDK.',
    exampleQuestionsTitle: 'EXAMPLE QUESTIONS',
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
    poweredBy: 'Powered by OneKey',
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

function ChatWidgetRuntime({ apiUrl, lang }) {
  const pathname = usePathname();
  const isZh = lang === 'zh';
  const copy = useMemo(() => getWidgetCopy(isZh), [isZh]);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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

  const resizeInput = useCallback(target => {
    const element = target ?? inputRef.current;
    if (!element) return;
    element.style.height = '20px';
    const nextHeight = Math.min(Math.max(element.scrollHeight, 20), 88);
    element.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status, isOpen]);

  useEffect(() => {
    resizeInput();
  }, [input, isOpen, resizeInput]);

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
    <div className={styles.root} data-onekey-doc-ai="root" data-docs-ai="root">
      {!isOpen ? (
        <button
          type="button"
          className={styles.fab}
          data-docs-ai="fab"
          onClick={() => setIsOpen(v => !v)}
          aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        >
          <SparklesIcon size={16} />
          <span className={styles.fabText}>{copy.fabText}</span>
        </button>
      ) : null}

      {isOpen ? (
        <section className={styles.panel} aria-label={copy.title} data-docs-ai="panel">
          <header className={styles.header} data-docs-ai="header">
            <h3 className={styles.headerTitle}>{copy.title}</h3>
            <button
              type="button"
              className={styles.closeButton}
              data-docs-ai="close"
              onClick={() => setIsOpen(false)}
            >
              <XIcon size={15} />
            </button>
          </header>

          <div className={styles.body} ref={scrollRef} data-docs-ai="body">
            {messages.length === 0 ? (
              <div className={styles.empty} data-docs-ai="empty">
                <div className={styles.assistantHead}>
                  <span className={styles.assistantIcon}>
                    <BotIcon size={13} />
                  </span>
                  <span>{copy.assistantLabel}</span>
                </div>
                <p className={styles.emptyGreeting}>{copy.greeting}</p>
                <div className={styles.emptyDescription}>
                  {copy.descriptionLines.map(line => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <p className={styles.emptyAsk}>{copy.askAnything}</p>
                <p className={styles.emptySection}>{copy.exampleQuestionsTitle}</p>
                <div className={styles.suggestionList}>
                  {copy.suggestions.map(item => (
                    <button
                      key={item.text}
                      type="button"
                      className={styles.suggestion}
                      data-docs-ai="suggestion"
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
                  className={`${styles.message} ${
                    isAssistant ? styles.assistantMessage : styles.userMessage
                  }`}
                >
                  {isAssistant ? <span className={styles.avatar}>A</span> : null}
                  <div className={styles.bubble}>
                    {textParts.map((part, index) => (
                      <MarkdownMessage key={`${message.id}-${index}`} text={part} copy={copy} />
                    ))}

                    {isAssistant ? (
                      <div className={styles.actions} data-docs-ai="actions">
                        <button type="button" onClick={() => handleCopyMessage(message)}>
                          <CopyIcon size={14} />
                          <span>{copiedMessageId === message.id ? copy.copied : copy.copy}</span>
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
              <div className={styles.status} data-docs-ai="status">
                <Loader2Icon size={14} className={styles.spin} />
                <span>{copy.sending}</span>
              </div>
            ) : null}

            {error ? (
              <div className={styles.error} data-docs-ai="error">
                <span>{copy.error}</span>
                <button type="button" onClick={clearError}>
                  OK
                </button>
              </div>
            ) : null}
          </div>

          <footer className={styles.footer} data-docs-ai="footer">
            <div className={styles.inputWrap} data-docs-ai="input-wrap">
              <textarea
                ref={inputRef}
                value={input}
                onChange={event => {
                  setInput(event.target.value);
                  resizeInput(event.target);
                }}
                className={styles.input}
                data-docs-ai="input"
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
                  className={`${styles.sendButton} ${styles.stopButton}`}
                  data-docs-ai="send"
                  onClick={stop}
                  aria-label={copy.stop}
                >
                  <SquareIcon size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.sendButton}
                  data-docs-ai="send"
                  onClick={() => handleSend()}
                  aria-label={copy.send}
                  disabled={!input.trim()}
                >
                  <SendIcon size={14} />
                </button>
              )}
            </div>
            <div className={styles.meta} data-docs-ai="meta">
              <span>{copy.poweredBy}</span>
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
