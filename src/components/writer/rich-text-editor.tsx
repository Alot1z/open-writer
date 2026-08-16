'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Highlighter,
  ImageIcon,
  Code,
  Minus,
} from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { FONT_MAP, loadEditorSettings, subscribeSettings } from '@/lib/settings'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  onWordCountChange?: (words: number, chars: number) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  typewriterMode?: boolean
}

function countWords(text: string): number {
  const clean = text.replace(/<[^>]*>/g, '').trim()
  return clean ? clean.split(/\s+/).length : 0
}

const ToolbarButton = ({
  pressed,
  onClick,
  tooltip,
  children,
  disabled,
}: {
  pressed?: boolean
  onClick?: () => void
  tooltip: string
  children: React.ReactNode
  disabled?: boolean
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Toggle
        size="sm"
        pressed={pressed}
        onPressedChange={onClick}
        disabled={disabled}
        className="h-7 w-7 p-0 data-[state=on]:bg-writer-accent-soft data-[state=on]:text-writer-accent"
      >
        {children}
      </Toggle>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

// Toolbar component declared outside render to avoid lint error
function EditorToolbar({ editor, addImage, addLink }: { editor: Editor; addImage: () => void; addLink: () => void }) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-writer-border bg-writer-surface/80 backdrop-blur-sm flex-wrap">
      <ToolbarButton
        pressed={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        tooltip="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        tooltip="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        tooltip="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        tooltip="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        tooltip="Code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        pressed={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        tooltip="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        tooltip="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        tooltip="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        pressed={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        tooltip="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        tooltip="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        tooltip="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        pressed={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        tooltip="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        tooltip="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        tooltip="Task List"
      >
        <ListChecks className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        tooltip="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="Divider"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ToolbarButton
        pressed={editor.isActive('link')}
        onClick={addLink}
        tooltip="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        tooltip="Highlight"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        pressed={false}
        onClick={addImage}
        tooltip="Image"
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  onWordCountChange,
  placeholder = 'Start writing...',
  readOnly = false,
  className,
  typewriterMode = false,
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorScrollRef = useRef<HTMLDivElement | null>(null)
  const typewriterRafRef = useRef<number | null>(null)
  const [editorSettings, setEditorSettings] = useState(loadEditorSettings)

  // Re-apply settings when they change (Settings dialog save)
  useEffect(() => subscribeSettings(() => setEditorSettings(loadEditorSettings())), [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      Typography,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdate.current) return
      const html = ed.getHTML()
      const text = ed.getText()
      const words = countWords(text)
      const chars = text.length

      // Debounced onChange
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange(html)
      }, 300)

      onWordCountChange?.(words, chars)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose-writer tiptap focus:outline-none',
          'max-w-none',
          'text-foreground',
        ),
      },
    },
  })

  // Handle external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isInternalUpdate.current = true
      editor.commands.setContent(content)
      isInternalUpdate.current = false
    }
  }, [content, editor])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (typewriterRafRef.current) cancelAnimationFrame(typewriterRafRef.current)
    }
  }, [])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl || '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  // Typewriter mode scroll logic
  useEffect(() => {
    if (!editor || !typewriterMode) return

    const scrollToCursor = () => {
      if (!editorScrollRef.current) return
      try {
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)
        const scrollContainer = editorScrollRef.current
        const scrollRect = scrollContainer.getBoundingClientRect()
        const desiredY = scrollRect.top + scrollRect.height * 0.4 // slightly above center
        const diff = coords.top - desiredY
        if (Math.abs(diff) > 10) {
          scrollContainer.scrollBy({
            top: diff,
            behavior: 'smooth',
          })
        }
      } catch {
        // coordsAtPos can fail in edge cases
      }
    }

    const handleUpdate = () => {
      if (typewriterRafRef.current) cancelAnimationFrame(typewriterRafRef.current)
      typewriterRafRef.current = requestAnimationFrame(scrollToCursor)
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
      if (typewriterRafRef.current) cancelAnimationFrame(typewriterRafRef.current)
    }
  }, [editor, typewriterMode])

  if (!editor) {
    return (
      <div className={cn('animate-pulse bg-muted/30 rounded-md h-64', className)} />
    )
  }

  const wordCount = countWords(editor.getText())
  const charCount = editor.storage.characterCount?.characters?.() ?? editor.getText().length

  return (
    <div className={cn('flex flex-col h-full', typewriterMode && 'typewriter-mode', className)}>
      {!readOnly && (
        <div className="group/toolbar">
          <EditorToolbar editor={editor} addImage={addImage} addLink={addLink} />
        </div>
      )}

      {/* Editor Content */}
      <div
        ref={editorScrollRef}
        className={cn('flex-1 overflow-y-auto custom-scrollbar', typewriterMode && 'scroll-smooth')}
      >
        <div
          className="mx-auto px-8 py-6"
          style={{
            maxWidth: editorSettings.maxWidth,
            fontFamily: FONT_MAP[editorSettings.fontFamily],
            fontSize: editorSettings.fontSize,
            lineHeight: editorSettings.lineHeight,
            ["--ow-para-spacing" as string]: editorSettings.paragraphSpacing + "rem",
          } as React.CSSProperties}
        >
          <EditorContent
            editor={editor}
            className="tiptap-wrapper"
          />
        </div>
      </div>

      {/* Word Count Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground border-t border-writer-border bg-writer-surface/50">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  )
}
