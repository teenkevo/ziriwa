'use client'

import * as React from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className='flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1'>
      <Toggle
        size='sm'
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('highlight')}
        onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className='h-4 w-4' />
      </Toggle>
      <span className='mx-1 h-4 w-px bg-border' />
      <Toggle
        size='sm'
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign('center').run()
        }
      >
        <AlignCenter className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive({ textAlign: 'justify' })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign('justify').run()
        }
      >
        <AlignJustify className='h-4 w-4' />
      </Toggle>
      <span className='mx-1 h-4 w-px bg-border' />
      <Toggle
        size='sm'
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className='h-4 w-4' />
      </Toggle>
      <Toggle
        size='sm'
        pressed={editor.isActive('blockquote')}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className='h-4 w-4' />
      </Toggle>
      <span className='mx-1 h-4 w-px bg-border' />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className='h-4 w-4' />
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className='h-4 w-4' />
      </Button>
    </div>
  )
}

export interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write your report here...',
  className,
  minHeight = '200px',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-3 py-2',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  React.useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-background',
        className,
      )}
      style={{ minHeight }}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className='[&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror]:empty:before:content-[attr(data-placeholder)] [&_.ProseMirror]:empty:before:text-muted-foreground [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul_li]:my-0.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol_li]:my-0.5'
      />
    </div>
  )
}
