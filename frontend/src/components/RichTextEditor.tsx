import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Mathematics from '@tiptap/extension-mathematics';
import { useEffect, useCallback, useState } from 'react';
import 'katex/dist/katex.min.css';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  Code,
  Sigma,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/** Editor Button */
function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Nhập nội dung...',
  className = '',
}: RichTextEditorProps) {
  const [showLatexInput, setShowLatexInput] = useState(false);
  const [latexValue, setLatexValue] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Không cần heading cho câu hỏi
      }),
      Underline,
      Superscript,
      Subscript,
      Placeholder.configure({ placeholder }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-slate-800',
      },
    },
  });

  // Sync nội dung khi prop content thay đổi (edit mode)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const insertLatex = useCallback(() => {
    if (!editor || !latexValue.trim()) return;
    // Chèn công thức dạng $...$
    editor.commands.insertContent(`$${latexValue}$`);
    setLatexValue('');
    setShowLatexInput(false);
    editor.commands.focus();
  }, [editor, latexValue]);

  if (!editor) return null;

  const iconSize = 'w-4 h-4';

  return (
    <div className={`rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        {/* Text Formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="In đậm (Ctrl+B)">
          <Bold className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="In nghiêng (Ctrl+I)">
          <Italic className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Gạch chân (Ctrl+U)">
          <UnderlineIcon className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Gạch ngang">
          <Strikethrough className={iconSize} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Superscript / Subscript */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')} title="Chỉ số trên">
          <SuperscriptIcon className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')} title="Chỉ số dưới">
          <SubscriptIcon className={iconSize} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Danh sách">
          <List className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Danh sách đánh số">
          <ListOrdered className={iconSize} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Code */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
          <Code className={iconSize} />
        </ToolbarButton>

        {/* Math/LaTeX */}
        <ToolbarButton onClick={() => setShowLatexInput(!showLatexInput)} isActive={showLatexInput} title="Chèn công thức toán (LaTeX)">
          <Sigma className={iconSize} />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác (Ctrl+Z)">
          <Undo className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Làm lại (Ctrl+Y)">
          <Redo className={iconSize} />
        </ToolbarButton>
      </div>

      {/* LaTeX Input */}
      {showLatexInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
          <Sigma className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <input
            type="text"
            value={latexValue}
            onChange={(e) => setLatexValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertLatex(); } }}
            placeholder="VD: \frac{a}{b}, x^2 + y^2 = z^2"
            className="flex-1 text-sm bg-transparent border-none outline-none text-amber-900 placeholder-amber-400"
            autoFocus
          />
          <button type="button" onClick={insertLatex} className="px-2.5 py-1 text-xs font-medium text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors">Chèn</button>
          <button type="button" onClick={() => { setShowLatexInput(false); setLatexValue(''); }} className="p-1 text-amber-400 hover:text-amber-600">
            <span className="text-xs">✕</span>
          </button>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
