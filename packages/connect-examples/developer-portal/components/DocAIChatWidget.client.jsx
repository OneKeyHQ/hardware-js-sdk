'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  CopyIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';
import MarkdownMessage from './DocAIMarkdownMessage';
import { OneKeyIcon } from './ChainIcons';
import { DOCS_AI_OPEN_EVENT, DOCS_AI_TAB } from './docAIAssistEvents';
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

const createRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const resolveSourcesApiUrl = chatApiUrl => {
  if (!chatApiUrl) return '';

  if (chatApiUrl.includes('/api/chat')) {
    return chatApiUrl.replace('/api/chat', '/api/sources');
  }

  return `${chatApiUrl.replace(/\/+$/, '')}/sources`;
};

const normalizeText = value => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
};

const normalizeSourceUrl = value => {
  if (typeof value !== 'string') return '';
  const next = value.trim();
  if (!next) return '';
  if (/^https?:\/\//i.test(next)) return next;
  return '';
};

const normalizeSources = rawSources => {
  if (!Array.isArray(rawSources)) return [];

  const map = new Map();
  for (const item of rawSources) {
    if (!item || typeof item !== 'object') continue;

    const url = normalizeSourceUrl(item.url);
    const title = normalizeText(item.title) || url || 'Untitled Source';
    if (!url) continue;

    const excerpt = normalizeText(item.excerpt).slice(0, 180);
    const type = normalizeText(item.type) || 'doc';
    const key = `${title}::${url}`;
    if (map.has(key)) continue;
    map.set(key, { title, url, excerpt, type });
  }

  return Array.from(map.values()).slice(0, 3);
};

const normalizeLocalHref = href => {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    if (url.pathname.startsWith('/_next')) return '';
    if (url.pathname.startsWith('/api')) return '';
    if (/\.(png|jpg|jpeg|svg|gif|css|js|json|xml|ico|map)$/i.test(url.pathname)) return '';
    if (!/^\/(en|zh)(\/|$)/.test(url.pathname)) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

const blockedSearchTitles = new Set([
  'skip to content',
  'home',
  'view docs',
  'project repository',
  'github issues',
  'submit a request',
  'twitter',
  'discord',
  'github',
]);

const isSearchAnchorAllowed = anchor => {
  if (!anchor) return false;
  if (anchor.closest('header.nextra-navbar')) return false;
  if (anchor.closest('footer')) return false;
  if (anchor.closest('[aria-label="Menu"]')) return false;
  return true;
};

const collectSearchEntries = () => {
  if (typeof window === 'undefined') return [];

  const anchors = Array.from(document.querySelectorAll('a[href]'));
  const map = new Map();

  for (const anchor of anchors) {
    if (!isSearchAnchorAllowed(anchor)) continue;
    const href = normalizeLocalHref(anchor.getAttribute('href'));
    if (!href || href === '#') continue;
    const path = href.replace(/[#?].*$/, '');
    if (!/^\/(en|zh)\/.+/.test(path)) continue;

    const rawTitle = normalizeText(anchor.textContent);
    const cleanedTitle = rawTitle.replace(/\bview docs\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (!cleanedTitle || cleanedTitle.length < 2) continue;
    if (blockedSearchTitles.has(cleanedTitle.toLowerCase())) continue;
    if (/^onekeydevelopers$/i.test(cleanedTitle)) continue;
    if (cleanedTitle === '/') continue;
    const title =
      cleanedTitle.length > 78 ? `${cleanedTitle.slice(0, 78).trimEnd()}…` : cleanedTitle;

    const key = `${title.toLowerCase()}::${path.toLowerCase()}`;
    if (map.has(key)) continue;

    map.set(key, {
      id: key,
      title,
      href,
      path,
    });
  }

  return Array.from(map.values());
};

const getWidgetCopy = isZh => {
  if (isZh) {
    return {
      title: '文档助手',
      searchTab: 'Search',
      askTab: 'Ask AI',
      searchPlaceholder: '搜索文档、API 与示例...',
      searchEmpty: '没有匹配结果，试试更短的关键词。',
      searchListTitle: '文档结果',
      searchCount: count => `${count} 条结果`,
      askHint: '找不到答案？切换 Ask AI 继续提问',
      askFromSearch: '转到 Ask AI',
      assistantLabel: 'AI 助手',
      askDescription: '我会基于 OneKey Hardware SDK 文档回答并给出来源。',
      exampleQuestionsTitle: '示例问题',
      closeLabel: '关闭',
      placeholder: '输入问题，例如：如何初始化 SDK？',
      sending: '生成中',
      send: '发送',
      stop: '停止',
      copy: '复制',
      copied: '已复制',
      retry: '重试',
      error: '请求失败，请重试。',
      sourcesTitle: '资料来源',
      poweredBy: 'Powered by OneKey',
      suggestions: [
        {
          text: '初始化 SDK',
          prompt: '如何初始化 OneKey Hardware SDK？请给我最小可运行示例。',
        },
        {
          text: '连接排查',
          prompt: '连接设备失败时，常见排查步骤有哪些？',
        },
        {
          text: '签名流程',
          prompt: '请解释一次完整的交易签名流程，并给代码示例。',
        },
      ],
    };
  }

  return {
    title: 'Docs Assistant',
    searchTab: 'Search',
    askTab: 'Ask AI',
    searchPlaceholder: 'Search docs, APIs, and examples...',
    searchEmpty: 'No matching docs yet. Try a shorter keyword.',
    searchListTitle: 'Documentation Results',
    searchCount: count => `${count} results`,
    askHint: 'Still blocked? continue in Ask AI.',
    askFromSearch: 'Ask AI with this query',
    assistantLabel: 'AI assistant',
    askDescription: 'I answer with OneKey Hardware SDK docs and source citations.',
    exampleQuestionsTitle: 'EXAMPLE QUESTIONS',
    closeLabel: 'Close',
    placeholder: 'Ask your question, e.g. How do I connect a device?',
    sending: 'Generating',
    send: 'Send',
    stop: 'Stop',
    copy: 'Copy',
    copied: 'Copied',
    retry: 'Retry',
    error: 'Request failed. Please retry.',
    sourcesTitle: 'Sources',
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
  const [activeTab, setActiveTab] = useState(DOCS_AI_TAB.SEARCH);
  const [searchInput, setSearchInput] = useState('');
  const [searchEntries, setSearchEntries] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');
  const [sourcesByMessageId, setSourcesByMessageId] = useState({});
  const [pendingSourceRequest, setPendingSourceRequest] = useState(null);

  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const scrollFrameRef = useRef(0);
  const sourceAbortRef = useRef(null);
  const composingRef = useRef(false);
  const justEndedComposingRef = useRef(false);

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

  const sourcesApiUrl = useMemo(() => resolveSourcesApiUrl(apiUrl), [apiUrl]);

  const sourceHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(headers || {}),
    }),
    [headers]
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

  const filteredSearchResults = useMemo(() => {
    const query = normalizeText(searchInput).toLowerCase();
    if (!query) {
      return searchEntries.slice(0, 18);
    }

    const tokens = query.split(' ').filter(Boolean);
    return searchEntries
      .map(item => {
        const title = item.title.toLowerCase();
        const path = item.path.toLowerCase();

        let score = 0;
        for (const token of tokens) {
          if (title.startsWith(token)) score += 10;
          if (title.includes(token)) score += 5;
          if (path.includes(token)) score += 3;
        }

        if (item.path === pathname || item.href === pathname) score += 1;
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 24);
  }, [pathname, searchEntries, searchInput]);

  const updateStickToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const offset = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottomRef.current = offset <= 28;
  }, []);

  const scheduleScrollToBottom = useCallback(
    (force = false) => {
      const element = scrollRef.current;
      if (!element) return;
      if (!force && !stickToBottomRef.current) return;

      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = requestAnimationFrame(() => {
        const node = scrollRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
        scrollFrameRef.current = 0;
      });
    },
    []
  );

  const resizeInput = useCallback(target => {
    const element = target ?? inputRef.current;
    if (!element) return;
    element.style.height = '24px';
    const nextHeight = Math.min(Math.max(element.scrollHeight, 24), 112);
    element.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scheduleScrollToBottom(false);
  }, [isOpen, messages, scheduleScrollToBottom, status]);

  useEffect(() => {
    resizeInput();
  }, [input, isOpen, resizeInput]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
      sourceAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    setSearchEntries(collectSearchEntries());
  }, [isOpen, pathname]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchInput, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = requestAnimationFrame(() => {
      if (activeTab === DOCS_AI_TAB.SEARCH) {
        searchInputRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = event => {
      const nextMode = event?.detail?.mode === DOCS_AI_TAB.ASK ? DOCS_AI_TAB.ASK : DOCS_AI_TAB.SEARCH;
      setActiveTab(nextMode);
      setIsOpen(true);
    };

    const handleGlobalKey = event => {
      const key = event.key?.toLowerCase();
      const isCommandK = key === 'k' && (event.metaKey || event.ctrlKey);

      if (isCommandK) {
        event.preventDefault();
        setActiveTab(DOCS_AI_TAB.SEARCH);
        setIsOpen(true);
        return;
      }

      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener(DOCS_AI_OPEN_EVENT, handleOpen);
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener(DOCS_AI_OPEN_EVENT, handleOpen);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [isOpen]);

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  const fetchSourcesForQuery = useCallback(
    async (query, requestId) => {
      if (!sourcesApiUrl) {
        setPendingSourceRequest(prev => {
          if (!prev || prev.requestId !== requestId) return prev;
          return {
            ...prev,
            status: 'done',
            sources: [],
          };
        });
        return;
      }

      sourceAbortRef.current?.abort();
      const controller = new AbortController();
      sourceAbortRef.current = controller;

      try {
        const response = await fetch(sourcesApiUrl, {
          method: 'POST',
          credentials: 'omit',
          headers: sourceHeaders,
          body: JSON.stringify({
            libraryId: resolveLibraryId(),
            pathname,
            lang,
            query,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Source request failed: ${response.status}`);
        }

        const payload = await response.json().catch(() => null);
        const sources = normalizeSources(payload?.sources);
        setPendingSourceRequest(prev => {
          if (!prev || prev.requestId !== requestId) return prev;
          return {
            ...prev,
            status: 'done',
            sources,
          };
        });
      } catch (requestError) {
        if (requestError?.name === 'AbortError') return;
        setPendingSourceRequest(prev => {
          if (!prev || prev.requestId !== requestId) return prev;
          return {
            ...prev,
            status: 'error',
            sources: [],
          };
        });
      } finally {
        if (sourceAbortRef.current === controller) {
          sourceAbortRef.current = null;
        }
      }
    },
    [lang, pathname, sourceHeaders, sourcesApiUrl]
  );

  useEffect(() => {
    if (!pendingSourceRequest || pendingSourceRequest.status === 'loading') return;
    if (isGenerating) return;
    const assistantId = messages.filter(message => message.role === 'assistant').at(-1)?.id;
    if (!assistantId) return;

    setSourcesByMessageId(prev => {
      if (Array.isArray(prev[assistantId]) && prev[assistantId].length > 0) return prev;
      return {
        ...prev,
        [assistantId]: pendingSourceRequest.sources || [],
      };
    });
    setPendingSourceRequest(null);
  }, [isGenerating, messages, pendingSourceRequest]);

  const handleSend = useCallback(
    async customInput => {
      const text = normalizeText(customInput ?? input);
      if (!text || isGenerating) return;

      const requestId = createRequestId();
      setPendingSourceRequest({
        requestId,
        status: 'loading',
        query: text,
        sources: [],
      });
      void fetchSourcesForQuery(text, requestId);

      setInput('');
      stickToBottomRef.current = true;
      scheduleScrollToBottom(true);
      await sendMessage({ text });
    },
    [fetchSourcesForQuery, input, isGenerating, scheduleScrollToBottom, sendMessage]
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

  const handleOpenAskFromSearch = useCallback(() => {
    const text = normalizeText(searchInput);
    setActiveTab(DOCS_AI_TAB.ASK);
    if (text && !input.trim()) {
      setInput(text);
    }
  }, [input, searchInput]);

  const handleOpenResult = useCallback(item => {
    if (!item?.href) return;
    setIsOpen(false);
    window.location.assign(item.href);
  }, []);

  const handleSearchInputKeyDown = useCallback(
    event => {
      if (!isOpen || activeTab !== DOCS_AI_TAB.SEARCH) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSearchIndex(prev => Math.min(prev + 1, Math.max(filteredSearchResults.length - 1, 0)));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSearchIndex(prev => Math.max(prev - 1, 0));
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const current = filteredSearchResults[activeSearchIndex];
        if (current) {
          handleOpenResult(current);
          return;
        }

        if (normalizeText(searchInput)) {
          handleOpenAskFromSearch();
        }
      }
    },
    [
      activeSearchIndex,
      activeTab,
      filteredSearchResults,
      handleOpenAskFromSearch,
      handleOpenResult,
      isOpen,
      searchInput,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.root} data-onekey-doc-ai="root" data-docs-ai="root">
      <button
        type="button"
        className={styles.overlay}
        aria-label={copy.closeLabel}
        onClick={() => setIsOpen(false)}
      />

      <section
        ref={panelRef}
        className={styles.panel}
        aria-label={copy.title}
        data-docs-ai="panel"
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.header} data-docs-ai="header">
          <div className={styles.headerTop}>
            <div className={styles.segment}>
              <button
                type="button"
                className={`${styles.segmentItem} ${
                  activeTab === DOCS_AI_TAB.SEARCH ? styles.segmentItemActive : ''
                }`}
                onClick={() => setActiveTab(DOCS_AI_TAB.SEARCH)}
              >
                <SearchIcon size={14} />
                <span>{copy.searchTab}</span>
              </button>
              <button
                type="button"
                className={`${styles.segmentItem} ${
                  activeTab === DOCS_AI_TAB.ASK ? styles.segmentItemActive : ''
                }`}
                onClick={() => setActiveTab(DOCS_AI_TAB.ASK)}
              >
                <SparklesIcon size={14} />
                <span>{copy.askTab}</span>
              </button>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              data-docs-ai="close"
              onClick={() => setIsOpen(false)}
              aria-label={copy.closeLabel}
            >
              <XIcon size={16} />
            </button>
          </div>

          {activeTab === DOCS_AI_TAB.SEARCH ? (
            <div className={styles.searchInputWrap}>
              <SearchIcon size={18} className={styles.searchInputIcon} />
              <input
                ref={searchInputRef}
                className={styles.searchInput}
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder={copy.searchPlaceholder}
                onKeyDown={handleSearchInputKeyDown}
              />
            </div>
          ) : (
            <p className={styles.askDescription}>{copy.askDescription}</p>
          )}
        </header>

        {activeTab === DOCS_AI_TAB.SEARCH ? (
          <div className={styles.searchBody} data-docs-ai="search-body">
            <p className={styles.searchSectionTitle}>{copy.searchListTitle}</p>
            <p className={styles.searchCount}>{copy.searchCount(filteredSearchResults.length)}</p>
            <div className={styles.searchResultList}>
              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.searchResultItem} ${
                      index === activeSearchIndex ? styles.searchResultItemActive : ''
                    }`}
                    onClick={() => handleOpenResult(item)}
                  >
                    <span className={styles.searchResultTitle}>{item.title}</span>
                    <span className={styles.searchResultPath}>{item.path}</span>
                  </button>
                ))
              ) : (
                <div className={styles.searchEmpty}>
                  <p>{copy.searchEmpty}</p>
                  <p className={styles.askHint}>{copy.askHint}</p>
                  <button type="button" className={styles.askFromSearch} onClick={handleOpenAskFromSearch}>
                    {copy.askFromSearch}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              className={styles.body}
              ref={scrollRef}
              data-docs-ai="body"
              onScroll={updateStickToBottom}
            >
              {messages.length === 0 ? (
                <div className={styles.empty} data-docs-ai="empty">
                  <div className={styles.assistantHead}>
                    <span className={styles.assistantIcon}>
                      <OneKeyIcon size={16} className={styles.avatarLogo} />
                    </span>
                    <span>{copy.assistantLabel}</span>
                  </div>
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
                const isLatestAssistantMessage = Boolean(
                  isAssistant && latestAssistantMessage?.id === message.id
                );
                const fallbackSources =
                  isLatestAssistantMessage &&
                  pendingSourceRequest?.status === 'done' &&
                  Array.isArray(pendingSourceRequest.sources)
                    ? pendingSourceRequest.sources
                    : [];
                const messageSources = sourcesByMessageId[message.id] || fallbackSources;
                const isStreamingMessage = Boolean(isLatestAssistantMessage && isGenerating);
                const shouldShowSources = Boolean(
                  isAssistant && !isStreamingMessage && messageSources.length > 0
                );

                return (
                  <div
                    key={message.id}
                    className={`${styles.message} ${
                      isAssistant ? styles.assistantMessage : styles.userMessage
                    }`}
                  >
                    {isAssistant ? (
                      <div className={styles.assistantMeta}>
                        <span className={styles.avatar}>
                          <OneKeyIcon size={16} className={styles.avatarLogo} />
                        </span>
                        <span className={styles.assistantName}>{copy.assistantLabel}</span>
                      </div>
                    ) : null}
                    <div className={styles.bubble}>
                      {textParts.map((part, index) => (
                        <MarkdownMessage
                          key={`${message.id}-${index}`}
                          text={part}
                          copy={copy}
                          isStreaming={isStreamingMessage}
                        />
                      ))}

                      {isAssistant ? (
                        <div className={styles.assistantTail}>
                          {shouldShowSources ? (
                            <div className={styles.sources} data-docs-ai="sources">
                              <p className={styles.sourcesTitle}>{copy.sourcesTitle}</p>
                              <ul className={styles.sourcesList}>
                                {messageSources.map((source, sourceIndex) => (
                                  <li
                                    key={`${message.id}-${source.url}-${sourceIndex}`}
                                    className={styles.sourceItem}
                                  >
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className={styles.sourceCard}
                                    >
                                      <span className={styles.sourceCardHead}>
                                        <span className={styles.sourceIndex}>{sourceIndex + 1}</span>
                                        <span className={styles.sourceMeta}>
                                          <span className={styles.sourceLink}>{source.title}</span>
                                          <span className={styles.sourceType}>{source.type}</span>
                                        </span>
                                      </span>
                                      {source.excerpt ? (
                                        <span className={styles.sourceExcerpt}>{source.excerpt}</span>
                                      ) : null}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
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
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {isGenerating ? (
                <div className={styles.status} data-docs-ai="status">
                  <span className={styles.statusText}>{copy.sending}</span>
                  <span className={styles.statusDots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
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
                    const nativeComposing = Boolean(event.nativeEvent?.isComposing);
                    const isImeEnter =
                      nativeComposing ||
                      composingRef.current ||
                      justEndedComposingRef.current ||
                      event.key === 'Process' ||
                      event.keyCode === 229;

                    if (event.key === 'Enter' && !event.shiftKey && !isImeEnter) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  onCompositionStart={() => {
                    composingRef.current = true;
                    justEndedComposingRef.current = false;
                  }}
                  onCompositionEnd={() => {
                    composingRef.current = false;
                    justEndedComposingRef.current = true;
                    requestAnimationFrame(() => {
                      justEndedComposingRef.current = false;
                    });
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
                    <SquareIcon size={14} />
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
          </>
        )}
      </section>
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
