import type { Editor } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

import {
  MentionList,
  type MentionPerson,
} from '@/components/ui/mention-list'

import { getMentionPopupContainer } from './mention-popup-container'

async function fetchMentionPeople(query: string): Promise<MentionPerson[]> {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())

  const response = await fetch(`/api/staff/mentions?${params.toString()}`)

  if (!response.ok) return []

  const data = (await response.json()) as { people?: MentionPerson[] }
  return data.people ?? []
}

function createMentionPopup(
  props: {
    editor: Editor
    clientRect?: (() => DOMRect | null) | null
  },
  component: ReactRenderer,
): TippyInstance | null {
  if (!props.clientRect) return null

  const editor = props.editor as Editor

  return tippy(document.createElement('div'), {
    getReferenceClientRect: () =>
      props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
    appendTo: () => getMentionPopupContainer(editor),
    content: component.element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
    arrow: false,
    theme: 'mention',
    maxWidth: 'none',
    hideOnClick: false,
    zIndex: 9999,
    popperOptions: {
      strategy: 'fixed',
    },
  })
}

export function createStaffMentionSuggestion(): Omit<
  SuggestionOptions<MentionPerson>,
  'editor'
> {
  return {
    char: '@',
    allowSpaces: false,
    items: async ({ query }) => fetchMentionPeople(query),
    render: () => {
      let component: ReactRenderer | null = null
      let popup: TippyInstance | null = null

      return {
        onStart: props => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor as Editor,
          })

          popup = createMentionPopup(
            {
              editor: props.editor as Editor,
              clientRect: props.clientRect,
            },
            component,
          )
        },
        onUpdate: props => {
          component?.updateProps(props)

          if (!props.clientRect) return

          popup?.setProps({
            getReferenceClientRect: () =>
              props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
          })
        },
        onKeyDown: props => {
          if (props.event.key === 'Escape') {
            popup?.hide()
            return true
          }

          return (
            (
              component?.ref as
                | { onKeyDown?: (props: { event: KeyboardEvent }) => boolean }
                | null
                | undefined
            )?.onKeyDown?.(props) ?? false
          )
        },
        onExit: () => {
          popup?.destroy()
          component?.destroy()
          popup = null
          component = null
        },
      }
    },
  }
}
