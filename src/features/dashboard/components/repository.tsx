import Image from 'next/image'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

interface FileItem {
  name: string
  date: string
  type: 'pdf' | 'folder' | 'csv' | 'doc'
  href: string
}

const recentlyAccessed: FileItem[] = [
  {
    name: 'Incorporation Documents',
    date: format(new Date(), 'MMM d, yyyy, h:mm a'),
    type: 'folder',
    href: 'javascript:void(0)',
  },
  {
    name: 'Legal Documents',
    date: format(new Date(), 'MMM d, yyyy, h:mm a'),
    type: 'folder',
    href: 'javascript:void(0)',
  },
  {
    name: 'Financial Documents',
    date: format(new Date(), 'MMM d, yyyy, h:mm a'),
    type: 'folder',
    href: 'javascript:void(0)',
  },
]

function FileCard({ item }: { item: FileItem }) {
  return (
    <Link
      onClick={() => {
        if (item.href === 'javascript:void(0)') {
          toast('Feature is still undergoing development', {
            description: 'Latest update was on 2024-Dec-04.',
            action: {
              label: 'Close',
              onClick: () => console.log('Undo'),
            },
          })
        }
      }}
      href={item.href}
      className='font-normal items-center'
    >
      <div className='p-4 border border-dashed rounded-lg shadow-slate-400 dark:shadow-gray-900 hover:shadow-md transition-shadow'>
        <div className='flex items-start gap-3'>
          <Image
            alt='folder-icon'
            className='aspect-square w-10 rounded-md object-cover'
            height='100'
            src='/folder-icon2.png'
            width='100'
          />
          <div className='space-y-1'>
            <h3 className='font-medium text-sm'>{item.name}</h3>
            <p className='text-xs text-muted-foreground'>
              Last updated: {item.date}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function Repository() {
  return (
    <div className='space-y-8'>
      <section>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4'>
          {recentlyAccessed.map(item => (
            <FileCard key={item.name} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
