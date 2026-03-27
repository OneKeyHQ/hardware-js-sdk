'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon } from 'lucide-react';
import { Highlight, Prism, themes } from 'prism-react-renderer';
import styles from './DocAIMarkdownMessage.module.css';

/* ── Register extra languages that prism-react-renderer doesn't ship ── */
if (typeof globalThis !== 'undefined' && !Prism.languages.bash) {
  Prism.languages.bash = Prism.languages.extend('clike', {
    comment: { pattern: /(^|[^"{\\$])#.*/, lookbehind: true },
    string: [
      { pattern: /\$'(?:[^'\\]|\\.)*'/, greedy: true },
      { pattern: /"(?:[^"\\$]|\\[\s\S]|\$(?:[^({]|\([^)]*\)|\{[^}]*\}))*"/, greedy: true },
      { pattern: /'[^']*'/, greedy: true },
    ],
    variable: /\$(?:\w+|[!#?*@$]|\{[^}]+\})/,
    keyword:
      /\b(?:if|then|else|elif|fi|for|while|until|do|done|in|case|esac|function|select|return|exit|break|continue|declare|local|export|readonly|unset|shift|trap|source|set)\b/,
    builtin:
      /\b(?:echo|printf|read|cd|pwd|pushd|popd|dirs|let|eval|exec|command|type|hash|true|false|test|cat|head|tail|grep|sed|awk|sort|uniq|wc|find|xargs|chmod|chown|mkdir|rmdir|rm|cp|mv|ln|touch|install|npm|npx|yarn|pnpm|pip|git|curl|wget|docker|node|deno|bun)\b/,
    operator: /&&|\|\||[!=<>]=?|[|&;]/,
  });
  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
  Prism.languages.zsh = Prism.languages.bash;
}

/* ── Java language (extends clike) ── */
if (typeof globalThis !== 'undefined' && !Prism.languages.java) {
  Prism.languages.java = Prism.languages.extend('clike', {
    keyword:
      /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield)\b/,
    number:
      /\b0b[01][01_]*L?\b|\b0x[\da-f_]*\.?[\da-f_p+-]+\b|(?:\b\d[\d_]*\.?[\d_]*|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?\b/i,
    operator: /->|[!=<>]=?|&&|\|\||[+\-*/%&|^~<>]=?|>>>?=?|\?|::|\.{3}/,
    'class-name': /\b[A-Z]\w*\b/,
    annotation: { pattern: /@\w+/, alias: 'punctuation' },
  });
}

const HIGHLIGHT_THEME = themes.oneDark;

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

const MAX_HIGHLIGHT_CODE_LENGTH = 12000;

/**
 * Strip any "Sources" / "参考资料" section appended by the model or context mode.
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
 */
const wrapBarePackageNames = text => {
  if (typeof text !== 'string') return text;

  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
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

/**
 * Lightweight code block using prism-react-renderer (~3 KB) instead of
 * react-syntax-highlighter (~200 KB).  Fast enough to highlight during streaming.
 */
function MarkdownCodeBlock({ className, children, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const language = normalizeLanguage(className);
  const displayLanguage = useMemo(() => (language === 'text' ? 'code' : language), [language]);
  const usePlain = code.length > MAX_HIGHLIGHT_CODE_LENGTH;

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
        {usePlain ? (
          <pre className={styles.codePlainPre}>
            <code className={styles.codeText}>{code}</code>
          </pre>
        ) : (
          <Highlight theme={HIGHLIGHT_THEME} code={code} language={language}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={styles.codePlainPre}
                style={{ ...style, background: 'transparent', margin: 0 }}
              >
                <code className={styles.codeText}>
                  {tokens.map((line, i) => {
                    const lineProps = getLineProps({ line, key: i });
                    return (
                      <div key={i} {...lineProps} style={undefined}>
                        {line.map((token, j) => {
                          const tokenProps = getTokenProps({ token, key: j });
                          return <span key={j} {...tokenProps} />;
                        })}
                      </div>
                    );
                  })}
                </code>
              </pre>
            )}
          </Highlight>
        )}
      </div>
    </div>
  );
}

// Stable reference for remarkPlugins
const REMARK_PLUGINS = [remarkGfm];

/**
 * Throttle interval for streaming renders.
 */
const STREAM_THROTTLE_MS = 120;

function DocAIMarkdownMessage({ text, copy, isStreaming = false }) {
  const [displayText, setDisplayText] = useState(text);
  const latestTextRef = useRef(text);
  const lastRenderTsRef = useRef(0);
  const trailingTimerRef = useRef(null);

  latestTextRef.current = text;

  useEffect(() => {
    if (!isStreaming) {
      clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = null;
      setDisplayText(text);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastRenderTsRef.current;

    if (elapsed >= STREAM_THROTTLE_MS) {
      lastRenderTsRef.current = now;
      clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = null;
      setDisplayText(text);
    } else if (!trailingTimerRef.current) {
      trailingTimerRef.current = setTimeout(() => {
        lastRenderTsRef.current = Date.now();
        trailingTimerRef.current = null;
        setDisplayText(latestTextRef.current);
      }, STREAM_THROTTLE_MS - elapsed);
    }
  }, [text, isStreaming]);

  useEffect(() => () => clearTimeout(trailingTimerRef.current), []);

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
          >
            {children}
          </MarkdownCodeBlock>
        );
      },
    }),
    [copy.copy, copy.copied]
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
