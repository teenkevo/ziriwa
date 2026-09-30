/**
 * Dark-mode fill for select-style dropdown triggers.
 * Light mode stays on the control's own border, background, and shadow.
 * `dark:hover:bg-background` keeps outline buttons from flashing the accent fill.
 */
export const dropdownSurfaceClassName =
  'dark:border-white/10 dark:bg-gradient-to-br dark:from-muted/60 dark:via-background dark:to-muted/25 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:hover:border-white/15 dark:hover:bg-background dark:hover:from-muted/70 dark:hover:to-muted/35 dark:data-[state=open]:border-white/20'
