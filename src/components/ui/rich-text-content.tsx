import {
  RICH_TEXT_MENTION_PROSE,
  RICH_TEXT_TABLE_PROSE,
} from '@/components/ui/rich-text-editor'
import { hasRichTextContent } from '@/lib/rich-text'
import { cn } from '@/lib/utils'

type RichTextContentProps = {
  html?: string | null
  className?: string
  emptyClassName?: string
  emptyText?: string
}

export function RichTextContent({
  html,
  className,
  emptyClassName,
  emptyText = '—',
}: RichTextContentProps) {
  if (!hasRichTextContent(html)) {
    return (
      <span className={cn('text-muted-foreground', emptyClassName)}>
        {emptyText}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none [&_ol]:list-decimal [&_ul]:list-disc',
        RICH_TEXT_TABLE_PROSE,
        RICH_TEXT_MENTION_PROSE,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html ?? '' }}
    />
  )
}
