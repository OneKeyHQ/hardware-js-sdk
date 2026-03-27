'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
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

const MAX_HIGHLIGHT_CODE_LENGTH = 8000;

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

/**
 * Wrap bare scoped npm package names (`@scope/package`) in backticks so
 * remark-gfm doesn't mangle the `@` as an autolink or email fragment.
 * Skips instances already inside backticks, inline code, or fenced code blocks.
 */
const wrapBarePackageNames = text => {
  if (typeof text !== 'string') return text;

  // Split on fenced code blocks AND inline code spans to avoid touching code
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return parts
    .map((part, i) => {
      // Odd indices are code — leave untouched
      if (i % 2 === 1) return part;
      // Wrap @scope/package-name that is NOT already inside backticks
      return part.replace(
        /(?<!`)@[\w-]+\/[\w.-]+(?!`)/g,
        match => `\`${match}\``
      );
    })
    .join('');
};

export const sanitizeDocAIMessageText = input => {
  if (typeof input !== 'string' || !input) return '';

  return stripRetrievalScaffold(
    stripInlineSources(
      wrapBarePackageNames(
        input
          .replace(/＠/g, '@')
          .replace(/@0nekeyfe\//gi, '@onekeyfe/')
      )
    )
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

// Stable reference for remarkPlugins — avoids ReactMarkdown re-init on every render
const REMARK_PLUGINS = [remarkGfm];

/**
 * Throttle interval for streaming renders. Uses a leading + trailing edge
 * pattern so the UI always shows the latest text within this interval,
 * even when token delivery pauses momentarily.
 */
const STREAM_THROTTLE_MS = 140;

function DocAIMarkdownMessage({ text, copy, isStreaming = false }) {
  const [displayText, setDisplayText] = useState(text);
  const latestTextRef = useRef(text);
  const lastRenderTsRef = useRef(0);
  const trailingTimerRef = useRef(null);

  latestTextRef.current = text;

  useEffect(() => {
    if (!isStreaming) {
      // Not streaming — render immediately, cancel any pending flush
      clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = null;
      setDisplayText(text);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastRenderTsRef.current;

    if (elapsed >= STREAM_THROTTLE_MS) {
      // Leading edge: enough time passed, render now
      lastRenderTsRef.current = now;
      clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = null;
      setDisplayText(text);
    } else if (!trailingTimerRef.current) {
      // Trailing edge: schedule a flush so the latest text always appears
      trailingTimerRef.current = setTimeout(() => {
        lastRenderTsRef.current = Date.now();
        trailingTimerRef.current = null;
        setDisplayText(latestTextRef.current);
      }, STREAM_THROTTLE_MS - elapsed);
    }
  }, [text, isStreaming]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(trailingTimerRef.current), []);

  // Memoize components so ReactMarkdown doesn't re-process when displayText
  // hasn't changed.  During streaming, code blocks use plain <pre> (no Prism)
  // to avoid expensive highlighting on every token — highlighting activates
  // once streaming ends.
  const components = useMemo(
    () => ({
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
            disableHighlight={isStreaming}
          >
            {children}
          </MarkdownCodeBlock>
        );
      },
    }),
    [copy.copy, copy.copied, isStreaming]
  );

  return (
    <div className={styles.markdown} data-docs-ai="markdown">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {displayText}
      </ReactMarkdown>
    </div>
  );
}

export default memo(DocAIMarkdownMessage);
