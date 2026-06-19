import { cn } from '@/lib/utils'

export const ASSESSMENT_FULLSCREEN_DIALOG_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden rounded-xl p-0',
  '!fixed !inset-3 !bottom-3 !left-3 !right-3 !top-3',
  '!h-auto !max-h-none !w-auto !max-w-none',
  '!translate-x-0 !translate-y-0',
  'sm:!inset-4',
  '[&>button.absolute]:hidden',
)

export const assessmentQuestionSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}
