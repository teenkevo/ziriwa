import { cn } from '@/lib/utils'
import NavLinks from '@/components/nav-links'

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn('hidden md:flex items-center space-x-4', className)}
      {...props}
    >
      <NavLinks />
    </nav>
  )
}
