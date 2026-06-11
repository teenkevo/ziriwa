'use client'

import * as React from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Columns3,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Plus,
  Quote,
  Redo,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'

const RICH_TEXT_TABLE_BASE_PROSE =
  '[&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2'

export const RICH_TEXT_TABLE_PROSE = RICH_TEXT_TABLE_BASE_PROSE

const RICH_TEXT_TABLE_EDITOR_PROSE = [
  RICH_TEXT_TABLE_BASE_PROSE.replace(/\[&_/g, '[&_.ProseMirror_'),
  '[&_.ProseMirror_.tableWrapper]:my-3 [&_.ProseMirror_.tableWrapper]:overflow-x-auto',
  '[&_.ProseMirror_th]:relative [&_.ProseMirror_td]:relative',
  '[&_.ProseMirror_th]:box-border [&_.ProseMirror_td]:box-border',
  '[&_.ProseMirror_th]:min-w-[3rem] [&_.ProseMirror_td]:min-w-[3rem]',
  '[&_.ProseMirror_th]:align-top [&_.ProseMirror_td]:align-top',
  '[&_.ProseMirror_.column-resize-handle]:absolute [&_.ProseMirror_.column-resize-handle]:right-[-3px] [&_.ProseMirror_.column-resize-handle]:top-0 [&_.ProseMirror_.column-resize-handle]:bottom-0 [&_.ProseMirror_.column-resize-handle]:z-20 [&_.ProseMirror_.column-resize-handle]:w-1 [&_.ProseMirror_.column-resize-handle]:bg-primary/80',
  '[&_.ProseMirror.resize-cursor]:cursor-col-resize',
].join(' ')

interface TableCellAnchor {
  top: number
  left: number
  width: number
  height: number
}

function getSelectedTableCell(editor: Editor): HTMLElement | null {
  const { from } = editor.state.selection
  const domAtPos = editor.view.domAtPos(from)
  let element = domAtPos.node as HTMLElement

  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement ?? element
  }

  return element.closest?.('td, th') ?? null
}

function getTableCellAnchor(
  editor: Editor,
  proseMirror: HTMLElement,
): TableCellAnchor | null {
  const cell = getSelectedTableCell(editor)
  if (!cell) return null

  const cellRect = cell.getBoundingClientRect()
  const containerRect = proseMirror.getBoundingClientRect()

  return {
    top: cellRect.top - containerRect.top + proseMirror.scrollTop,
    left: cellRect.left - containerRect.left + proseMirror.scrollLeft,
    width: cellRect.width,
    height: cellRect.height,
  }
}

function useEditorRerender(editor: Editor | null) {
  const [, setTick] = React.useState(0)

  React.useEffect(() => {
    if (!editor) return

    const update = () => setTick((tick) => tick + 1)
    editor.on('transaction', update)
    editor.on('selectionUpdate', update)

    return () => {
      editor.off('transaction', update)
      editor.off('selectionUpdate', update)
    }
  }, [editor])
}

function TableToolbar({ editor }: { editor: Editor }) {
  const isInTable = editor.isActive('table')

  if (!isInTable) {
    return (
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        title='Insert table'
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className='h-4 w-4' />
        <span className='sr-only'>Insert table</span>
      </Button>
    )
  }

  return (
    <div className='flex items-center gap-0.5'>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        title='Add row above selected row'
        disabled={!editor.can().addRowBefore()}
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        <ArrowUp className='h-4 w-4' />
        <span className='sr-only'>Add row above selected row</span>
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        title='Add row below selected row'
        disabled={!editor.can().addRowAfter()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <ArrowDown className='h-4 w-4' />
        <span className='sr-only'>Add row below selected row</span>
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        title='Add column left of selected column'
        disabled={!editor.can().addColumnBefore()}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        <ArrowLeft className='h-4 w-4' />
        <span className='sr-only'>Add column left of selected column</span>
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8'
        title='Add column right of selected column'
        disabled={!editor.can().addColumnAfter()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <ArrowRight className='h-4 w-4' />
        <span className='sr-only'>Add column right of selected column</span>
      </Button>
      <span className='mx-0.5 h-4 w-px bg-border' />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-destructive hover:text-destructive'
        title='Delete selected row'
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <Rows3 className='h-4 w-4' />
        <span className='sr-only'>Delete selected row</span>
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-destructive hover:text-destructive'
        title='Delete selected column'
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <Columns3 className='h-4 w-4' />
        <span className='sr-only'>Delete selected column</span>
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-destructive hover:text-destructive'
        title='Delete entire table'
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 className='h-4 w-4' />
        <span className='sr-only'>Delete entire table</span>
      </Button>
    </div>
  )
}

function TableCellExtendOverlay({
  editor,
  containerRef,
}: {
  editor: Editor | null
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const [cellAnchor, setCellAnchor] = React.useState<TableCellAnchor | null>(
    null,
  )

  React.useEffect(() => {
    if (!editor) return
    const activeEditor: Editor = editor

    function update() {
      const proseMirror = containerRef.current?.querySelector(
        '.ProseMirror',
      ) as HTMLElement | null

      if (
        !activeEditor.isEditable ||
        !activeEditor.isFocused ||
        !activeEditor.isActive('table') ||
        !proseMirror
      ) {
        setCellAnchor(null)
        return
      }

      setCellAnchor(getTableCellAnchor(activeEditor, proseMirror))
    }

    update()
    activeEditor.on('selectionUpdate', update)
    activeEditor.on('transaction', update)
    activeEditor.on('focus', update)
    activeEditor.on('blur', update)

    const proseMirror = containerRef.current?.querySelector('.ProseMirror')
    proseMirror?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      activeEditor.off('selectionUpdate', update)
      activeEditor.off('transaction', update)
      activeEditor.off('focus', update)
      activeEditor.off('blur', update)
      proseMirror?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [editor, containerRef])

  if (!editor || !cellAnchor) return null

  const controls = [
    {
      key: 'row-before',
      title: 'Add row above selected row',
      disabled: !editor.can().addRowBefore(),
      style: {
        top: cellAnchor.top - 10,
        left: cellAnchor.left + cellAnchor.width / 2,
        transform: 'translate(-50%, -50%)',
      },
      icon: ArrowUp,
      onClick: () => editor.chain().focus().addRowBefore().run(),
    },
    {
      key: 'row-after',
      title: 'Add row below selected row',
      disabled: !editor.can().addRowAfter(),
      style: {
        top: cellAnchor.top + cellAnchor.height + 10,
        left: cellAnchor.left + cellAnchor.width / 2,
        transform: 'translate(-50%, -50%)',
      },
      icon: ArrowDown,
      onClick: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      key: 'col-before',
      title: 'Add column left of selected column',
      disabled: !editor.can().addColumnBefore(),
      style: {
        top: cellAnchor.top + cellAnchor.height / 2,
        left: cellAnchor.left - 10,
        transform: 'translate(-50%, -50%)',
      },
      icon: ArrowLeft,
      onClick: () => editor.chain().focus().addColumnBefore().run(),
    },
    {
      key: 'col-after',
      title: 'Add column right of selected column',
      disabled: !editor.can().addColumnAfter(),
      style: {
        top: cellAnchor.top + cellAnchor.height / 2,
        left: cellAnchor.left + cellAnchor.width + 10,
        transform: 'translate(-50%, -50%)',
      },
      icon: ArrowRight,
      onClick: () => editor.chain().focus().addColumnAfter().run(),
    },
  ] as const

  return (
    <div className='pointer-events-none absolute inset-0 z-20'>
      {controls.map((control) => (
        <Button
          key={control.key}
          type='button'
          variant='secondary'
          size='icon'
          className='pointer-events-auto absolute h-5 w-5 rounded-full shadow-sm'
          style={control.style}
          title={control.title}
          disabled={control.disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={control.onClick}
        >
          <Plus className='h-3 w-3' />
          <span className='sr-only'>{control.title}</span>
        </Button>
      ))}
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  useEditorRerender(editor)

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
      <TableToolbar editor={editor} />
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
      TableKit.configure({
        table: {
          resizable: true,
          handleWidth: 8,
          cellMinWidth: 48,
          lastColumnResizable: true,
        },
      }),
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

  const editorSurfaceRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      className={cn('rounded-md border bg-background', className)}
      style={{ minHeight }}
    >
      <Toolbar editor={editor} />
      <div ref={editorSurfaceRef} className='relative overflow-x-auto'>
        <EditorContent
          editor={editor}
          className={cn(
            '[&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror]:empty:before:content-[attr(data-placeholder)] [&_.ProseMirror]:empty:before:text-muted-foreground [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul_li]:my-0.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol_li]:my-0.5 [&_.ProseMirror_.selectedCell]:bg-primary/10',
            RICH_TEXT_TABLE_EDITOR_PROSE,
          )}
        />
        <TableCellExtendOverlay
          editor={editor}
          containerRef={editorSurfaceRef}
        />
      </div>
    </div>
  )
}
