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

const normalizeMarkdownArtifacts = input => {
  if (typeof input !== 'string' || !input) return '';

  return input
    .replace(/＠/g, '@')
    .replace(/@0nekeyfe\//gi, '@onekeyfe/');
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
