'use client'

import * as React from 'react'
import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <Button
      variant='ghost'
      className='bg-transparent hover:bg-transparent focus-visible:ring-0'
      size='icon'
      onClick={toggleTheme}
    >
      {theme === 'light' ? (
        <MoonIcon className='h-[1.2rem] text-black w-[1.2rem] transition-all' />
      ) : (
        <SunIcon className='h-[1.2rem] text-yellow-400 w-[1.2rem] transition-all' />
      )}
      <span className='sr-only'>Toggle theme</span>
    </Button>
  )
}
