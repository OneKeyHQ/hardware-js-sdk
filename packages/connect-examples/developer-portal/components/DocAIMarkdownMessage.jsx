'use client';

import { useCallback, useMemo, useState } from 'react';
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

function MarkdownCodeBlock({ className, children, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const language = normalizeLanguage(className);
  const displayLanguage = useMemo(() => {
    if (language === 'text') return 'code';
    return language;
  }, [language]);

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
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function DocAIMarkdownMessage({ text, copy }) {
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
