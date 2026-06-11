import type { Editor } from '@tiptap/core'

/**
 * Radix modal dialogs disable pointer events on `document.body`, so mention
 * popups appended to `body` are visible but not clickable. Mount inside the
 * nearest dialog (or editor shell) instead.
 */
export function getMentionPopupContainer(editor: Editor): HTMLElement {
  const editorDom = editor.view.dom

  return (
    (editorDom.closest('[role="dialog"]') as HTMLElement | null) ??
    (editorDom.closest('[data-radix-dialog-content]') as HTMLElement | null) ??
    (editorDom.closest('[data-editor-surface]') as HTMLElement | null) ??
    editorDom.parentElement ??
    document.body
  )
}
