'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { AssistantModal, makeMarkdownText } from '@assistant-ui/react-ui';
import remarkGfm from 'remark-gfm';

const MarkdownText = makeMarkdownText({
  remarkPlugins: [remarkGfm],
});

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

const getModalConfig = isZh => {
  if (isZh) {
    return {
      welcome: {
        message: '你好，我是 OneKey Hardware SDK 文档助手。',
        suggestions: [
          {
            text: '如何初始化 SDK？',
            prompt: '如何初始化 OneKey Hardware SDK？请给我最小可运行示例。',
          },
          { text: '设备连接排查', prompt: '连接设备失败时，常见排查步骤有哪些？' },
          { text: '签名流程说明', prompt: '请解释一次完整的交易签名流程，并给代码示例。' },
        ],
      },
      assistantMessage: {
        components: {
          Text: MarkdownText,
        },
      },
      strings: {
        assistantModal: {
          open: { button: { tooltip: '关闭 AI 助手' } },
          closed: { button: { tooltip: '打开 AI 助手' } },
        },
        welcome: {
          message: '你好，我是 OneKey Hardware SDK 文档助手。',
        },
        thread: {
          scrollToBottom: { tooltip: '滚动到底部' },
        },
        composer: {
          input: { placeholder: '输入你的问题，例如：如何连接设备？' },
          send: { tooltip: '发送' },
          cancel: { tooltip: '停止生成' },
        },
        assistantMessage: {
          copy: { tooltip: '复制' },
          reload: { tooltip: '重新生成' },
        },
        userMessage: {
          edit: { tooltip: '编辑后重发' },
        },
        code: {
          header: {
            copy: { tooltip: '复制代码' },
          },
        },
      },
    };
  }

  return {
    welcome: {
      message: 'Hi, I am the OneKey Hardware SDK docs assistant.',
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
    },
    assistantMessage: {
      components: {
        Text: MarkdownText,
      },
    },
    strings: {
      assistantModal: {
        open: { button: { tooltip: 'Close AI assistant' } },
        closed: { button: { tooltip: 'Open AI assistant' } },
      },
      welcome: {
        message: 'Hi, I am the OneKey Hardware SDK docs assistant.',
      },
      thread: {
        scrollToBottom: { tooltip: 'Scroll to bottom' },
      },
      composer: {
        input: { placeholder: 'Ask your question, e.g. How do I connect a device?' },
        send: { tooltip: 'Send' },
        cancel: { tooltip: 'Stop generation' },
      },
      assistantMessage: {
        copy: { tooltip: 'Copy' },
        reload: { tooltip: 'Regenerate' },
      },
      userMessage: {
        edit: { tooltip: 'Edit and resend' },
      },
      code: {
        header: {
          copy: { tooltip: 'Copy code' },
        },
      },
    },
  };
};

function ChatWidgetRuntime({ apiUrl, lang }) {
  const pathname = usePathname();
  const isZh = lang === 'zh';

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
      new AssistantChatTransport({
        api: apiUrl,
        credentials: 'omit',
        headers,
        body,
      }),
    [apiUrl, headers, body]
  );

  const runtime = useChatRuntime({ transport });
  const modalConfig = useMemo(() => getModalConfig(isZh), [isZh]);

  return (
    <div data-onekey-doc-ai="root">
      <AssistantRuntimeProvider runtime={runtime}>
        <AssistantModal {...modalConfig} />
      </AssistantRuntimeProvider>
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
