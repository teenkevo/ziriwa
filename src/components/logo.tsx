import Link from 'next/link'
import React from 'react'
import { Sixtyfour } from 'next/font/google'

const sixtyFour = Sixtyfour({ subsets: ['latin'] })

export default function Logo({
  href = '/',
  prefetch,
  onClick,
}: {
  href?: string
  prefetch?: boolean
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}) {
  return (
    <div className='flex items-center min-w-max'>
      <Link
        href={href}
        prefetch={prefetch}
        onClick={onClick}
        className='font-normal items-center'
      >
        <div
          className={`flex items-center -space-x-3 text-primary text-lg mb-0 leading-none ${sixtyFour.className}`}
        >
          ZIRIWA
        </div>

        <span className='text-xs font-normal ml-1 leading-none'>
          By Data, Innovations & Projects{' '}
        </span>
      </Link>
    </div>
  )
}
