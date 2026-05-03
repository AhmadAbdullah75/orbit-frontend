import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

const ToolbarButton = ({ onClick, active, title,
  children, isDark }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
      background: active
        ? isDark
          ? 'rgba(99,102,241,0.2)'
          : 'rgba(99,102,241,0.1)'
        : 'transparent',
      color: active
        ? '#6366f1'
        : isDark ? '#94a3b8' : '#64748b',
      transition: 'all 0.15s',
    }}
  >
    {children}
  </button>
)

export default function RichTextEditor({
  content, onChange, isDark,
  placeholder = 'Add a description...',
  editable = true,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2],
        },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content || '')
    }
  }, [content])

  if (!editor) return null

  const btnStyle = {
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      padding: '6px 8px',
      borderBottom: isDark
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid #f1f5f9',
      flexWrap: 'wrap',
    }
  }

  return (
    <div style={{
      borderRadius: '10px',
      border: isDark
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid #e2e8f0',
      overflow: 'hidden',
      background: isDark
        ? 'rgba(255,255,255,0.02)'
        : '#fafafa',
    }}>
      {/* Toolbar */}
      {editable && (
        <div style={btnStyle.toolbar}>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold" isDark={isDark}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic" isDark={isDark}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline" isDark={isDark}>
            <span style={{
              textDecoration: 'underline'
            }}>U</span>
          </ToolbarButton>

          <div style={{
            width: '1px', height: '18px', margin: '0 4px',
            background: isDark
              ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
          }} />

          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list" isDark={isDark}>
            ☰
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list" isDark={isDark}>
            1.
          </ToolbarButton>

          <div style={{
            width: '1px', height: '18px', margin: '0 4px',
            background: isDark
              ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
          }} />

          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading',
              { level: 2 })}
            title="Heading" isDark={isDark}>
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block" isDark={isDark}>
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus()
              .toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote" isDark={isDark}>
            "
          </ToolbarButton>
        </div>
      )}

      {/* Editor content */}
      <div style={{ padding: '12px 14px' }}>
        <style>{`
          .ProseMirror {
            outline: none;
            min-height: 100px;
            font-size: 13px;
            line-height: 1.7;
            color: ${isDark ? '#cbd5e1' : '#475569'};
          }
          .ProseMirror p { margin: 0 0 8px; }
          .ProseMirror ul, .ProseMirror ol {
            padding-left: 20px; margin: 0 0 8px;
          }
          .ProseMirror h2 {
            font-size: 15px; font-weight: 700;
            margin: 12px 0 6px;
            color: ${isDark ? '#f1f5f9' : '#1e293b'};
          }
          .ProseMirror code {
            background: ${isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.05)'};
            padding: 1px 5px; border-radius: 4px;
            font-size: 12px; font-family: monospace;
          }
          .ProseMirror pre {
            background: ${isDark ? '#0f0f0f' : '#f8fafc'};
            border-radius: 8px; padding: 12px;
            overflow-x: auto; margin: 8px 0;
          }
          .ProseMirror pre code {
            background: none; padding: 0;
          }
          .ProseMirror blockquote {
            border-left: 3px solid #6366f1;
            padding-left: 12px; margin: 8px 0;
            color: ${isDark ? '#94a3b8' : '#64748b'};
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: ${isDark ? '#334155' : '#cbd5e1'};
            pointer-events: none;
            height: 0;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
