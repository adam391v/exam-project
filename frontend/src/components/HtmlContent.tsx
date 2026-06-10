import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface HtmlContentProps {
  html: string;
  className?: string;
}

/**
 * Render HTML content từ Tiptap editor.
 * Tự động render LaTeX inline ($...$) và block ($$...$$)
 */
export default function HtmlContent({ html, className = '' }: HtmlContentProps) {
  const rendered = useMemo(() => {
    if (!html) return '';

    // Render block LaTeX: $$...$$
    let result = html.replace(/\$\$([^$]+)\$\$/g, (_match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return `<span class="text-red-500">[Lỗi LaTeX: ${latex}]</span>`;
      }
    });

    // Render inline LaTeX: $...$
    result = result.replace(/\$([^$]+)\$/g, (_match, latex) => {
      try {
        return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `<span class="text-red-500">[Lỗi LaTeX: ${latex}]</span>`;
      }
    });

    return result;
  }, [html]);

  return (
    <div
      className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
