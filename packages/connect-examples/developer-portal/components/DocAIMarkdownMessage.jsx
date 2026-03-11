'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './DocAIMarkdownMessage.module.css';

const LANGUAGE_ALIASES = {
  ts: 'typescript',
  js: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  txt: 'text',
  plaintext: 'text',
};

const normalizeLanguage = className => {
  const raw = className?.replace('language-', '').trim().toLowerCase();
  if (!raw) return 'text';
  return LANGUAGE_ALIASES[raw] || raw;
};

const MAX_HIGHLIGHT_CODE_LENGTH = 2200;

/**
 * Strip any "Sources" / "参考资料" section appended by the model or context mode.
 * The frontend renders source cards separately from /api/sources, so inline
 * source lists from the model response are redundant and removed here.
 *
 * Handled patterns:
 *   ## Sources / ### Sources / **Sources** headings
 *   Horizontal-rule  "---" followed by a Sources heading
 *   Bare "Sources:" label
 * Everything from the first match to the end of the string is stripped.
 */
const INLINE_SOURCES_RE =
  /\n{1,2}(?:---+[ \t]*\n[ \t]*)?(?:#{1,3}[ \t]+|\*{1,2})?(?:Sources?|参考资料|References?)(?:\*{1,2})?[ \t]*:?[ \t]*\n[\s\S]*/i;

const RETRIEVAL_PREFIX_PATTERNS = [
  /^Retrieved documentation context for[^\n]*\.\s*\n?/i,
  /^Question:[^\n]*\n?/i,
  /^Current path:[^\n]*\n?/i,
  /^Language:[^\n]*\n?/i,
  /^已通过 Context7 检索文档（库：[^\n]*）。\s*\n?/i,
  /^问题：[^\n]*\n?/i,
  /^当前文档路径：[^\n]*\n?/i,
  /^语言：[^\n]*\n?/i,
];

const RETRIEVAL_FOOTER_PATTERNS = [
  /\n*Ask a follow-up question if you want an answer grounded in these sources\.\s*$/i,
  /\n*If you want, I can continue with a more specific answer based on these sources\.\s*$/i,
  /\n*如果你愿意，我可以继续基于这个问题给你一个更贴近当前页面的步骤化答案。\s*$/i,
  /\n*注：Chat 直连失败，已自动降级为 Context 检索模式。\s*$/i,
];

const stripInlineSources = text => {
  if (typeof text !== 'string') return text;
  return text.replace(INLINE_SOURCES_RE, '').trimEnd();
};

const stripRetrievalScaffold = text => {
  if (typeof text !== 'string') return text;

  let next = text.trim();
  let changed = true;

  while (changed && next) {
    changed = false;
    for (const pattern of RETRIEVAL_PREFIX_PATTERNS) {
      const replaced = next.replace(pattern, '').trimStart();
      if (replaced !== next) {
        next = replaced;
        changed = true;
      }
    }
  }

  for (const pattern of RETRIEVAL_FOOTER_PATTERNS) {
    next = next.replace(pattern, '').trimEnd();
  }

  return next.trim();
};

export const sanitizeDocAIMessageText = input => {
  if (typeof input !== 'string' || !input) return '';

  return stripRetrievalScaffold(
    stripInlineSources(
      input
        .replace(/＠/g, '@')
        .replace(/@0nekeyfe\//gi, '@onekeyfe/')
    )
  );
};

const normalizeMarkdownArtifacts = input => {
  if (typeof input !== 'string' || !input) return '';

  return sanitizeDocAIMessageText(
    input
      .replace(/＠/g, '@')
      .replace(/@0nekeyfe\//gi, '@onekeyfe/')
  );
};

function MarkdownCodeBlock({ className, children, copyLabel, copiedLabel, disableHighlight = false }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const language = normalizeLanguage(className);
  const displayLanguage = useMemo(() => {
    if (language === 'text') return 'code';
    return language;
  }, [language]);
  const shouldUsePlainCode = disableHighlight || code.length > MAX_HIGHLIGHT_CODE_LENGTH;

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
    <div className={styles.codeBlock} data-docs-ai="code-block">
      <div className={styles.codeHead}>
        <span>{displayLanguage}</span>
        <button
          type="button"
          className={styles.codeCopy}
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyLabel}
        >
          <CopyIcon size={14} />
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      <div className={styles.codeScroll}>
        {shouldUsePlainCode ? (
          <pre className={styles.codePlainPre}>
            <code className={styles.codeText}>{code}</code>
          </pre>
        ) : (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            PreTag="div"
            wrapLongLines={false}
            customStyle={{
              margin: 0,
              padding: '10px 12px',
              background: 'transparent',
              border: '0',
              borderRadius: 0,
              overflow: 'visible',
              fontFamily: 'var(--font-mono)',
            }}
            codeTagProps={{
              className: styles.codeText,
              style: {
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                lineHeight: 1.56,
                fontWeight: 450,
                whiteSpace: 'pre',
                background: 'transparent',
                textShadow: 'none',
              },
            }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

function DocAIMarkdownMessage({ text, copy, isStreaming = false }) {
  const markdownText = useMemo(() => normalizeMarkdownArtifacts(text), [text]);

  if (isStreaming) {
    return (
      <div className={styles.markdown} data-docs-ai="markdown">
        <pre className={styles.streamingText}>{text}</pre>
      </div>
    );
  }

  return (
    <div className={styles.markdown} data-docs-ai="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: props => <a {...props} target="_blank" rel="noreferrer noopener" />,
          pre: ({ children }) => children,
          code: ({ node, className, children, ...props }) => {
            const code = String(children ?? '');
            const hasLanguage = typeof className === 'string' && className.includes('language-');
            const isMultilinePosition = Boolean(
              node?.position && node.position.start?.line !== node.position.end?.line
            );
            const isBlock = hasLanguage || isMultilinePosition || code.includes('\n');

            if (!isBlock) {
              return (
                <code {...props} className={styles.inlineCode}>
                  {children}
                </code>
              );
            }

            return (
              <MarkdownCodeBlock
                className={className}
                copyLabel={copy.copy}
                copiedLabel={copy.copied}
                disableHighlight={false}
              >
                {children}
              </MarkdownCodeBlock>
            );
          },
        }}
      >
        {markdownText}
      </ReactMarkdown>
    </div>
  );
}

export default memo(
  DocAIMarkdownMessage,
  (prevProps, nextProps) =>
    prevProps.text === nextProps.text &&
    prevProps.copy === nextProps.copy &&
    prevProps.isStreaming === nextProps.isStreaming
);
