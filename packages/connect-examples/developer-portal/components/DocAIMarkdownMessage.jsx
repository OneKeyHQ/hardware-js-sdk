'use client';

import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon } from 'lucide-react';
import styles from './DocAIMarkdownMessage.module.css';

function MarkdownCodeBlock({ className, children, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const language = className?.replace('language-', '') || 'code';

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
        <span>{language}</span>
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
      <pre>
        <code className={className}>{code}</code>
      </pre>
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
          pre: ({ children }) => <>{children}</>,
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
