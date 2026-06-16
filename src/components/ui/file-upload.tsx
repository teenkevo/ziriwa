'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  AlertCircle,
  CheckCircle,
  File as FileIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface FileUploadItem {
  file: File
  preview?: string
  error?: string
}

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  multiple?: boolean
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
  isUploading?: boolean
  className?: string
  dropzoneTitle?: string
  dropzoneHint?: string
}

function formatFileSizeMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function isDuplicateFile(candidate: File, list: FileUploadItem[]): boolean {
  return list.some(
    item =>
      item.file.name === candidate.name &&
      item.file.size === candidate.size &&
      item.file.lastModified === candidate.lastModified,
  )
}

function buildPreview(file: File): string | undefined {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return undefined
}

function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  )
}

export function FileUpload({
  files,
  onFilesChange,
  multiple = false,
  accept = '*',
  maxSizeMb = 5,
  disabled = false,
  isUploading = false,
  className,
  dropzoneTitle = 'Drag & drop files here',
  dropzoneHint,
}: FileUploadProps) {
  const [items, setItems] = React.useState<FileUploadItem[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const itemsRef = React.useRef<FileUploadItem[]>([])

  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  React.useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.preview) URL.revokeObjectURL(item.preview)
      }
    }
  }, [])

  React.useEffect(() => {
    if (files.length > 0) return

    setItems(current => {
      for (const item of current) {
        if (item.preview) URL.revokeObjectURL(item.preview)
      }
      return []
    })
  }, [files])

  const emitFiles = React.useCallback(
    (nextItems: FileUploadItem[]) => {
      onFilesChange(nextItems.filter(item => !item.error).map(item => item.file))
    },
    [onFilesChange],
  )

  const handleSelectedFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled || isUploading) return

    const nextItems: FileUploadItem[] = multiple ? [...items] : []

    Array.from(selectedFiles).forEach(file => {
      if (isDuplicateFile(file, nextItems) || isDuplicateFile(file, items)) {
        return
      }

      if (file.size > maxSizeMb * 1024 * 1024) {
        nextItems.push({
          file,
          error: `File exceeds ${maxSizeMb}MB limit`,
        })
        return
      }

      nextItems.push({
        file,
        preview: buildPreview(file),
      })
    })

    const normalizedItems = multiple ? nextItems : nextItems.slice(0, 1)
    setItems(normalizedItems)
    emitFiles(normalizedItems)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    if (disabled || isUploading) return

    setItems(current => {
      const nextItems = [...current]
      const [removed] = nextItems.splice(index, 1)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      emitFiles(nextItems)
      return nextItems
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (disabled || isUploading) return
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const hint =
    dropzoneHint ??
    `${multiple ? 'Upload multiple files up to ' : 'Upload a file up to '}${maxSizeMb}MB`

  return (
    <div className={cn('w-full space-y-4', className)}>
      {items.length > 0 ? (
        <div className='space-y-3'>
          {items.map((item, index) => (
            <div
              key={`${item.file.name}-${item.file.lastModified}-${index}`}
              className='flex items-center gap-3 rounded-md border bg-background p-3'
            >
              <div className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted'>
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className='h-full w-full object-cover'
                  />
                ) : isPdfFile(item.file) ? (
                  <Image
                    src='/pdf.png'
                    alt=''
                    width={24}
                    height={24}
                    className='rounded'
                  />
                ) : (
                  <FileIcon className='h-5 w-5 text-muted-foreground' />
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='truncate text-sm font-medium'>{item.file.name}</p>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 shrink-0 rounded-full'
                    onClick={event => {
                      event.stopPropagation()
                      removeFile(index)
                    }}
                    disabled={disabled || isUploading}
                  >
                    <X className='h-4 w-4' />
                    <span className='sr-only'>Remove file</span>
                  </Button>
                </div>

                <div className='text-xs text-muted-foreground'>
                  {item.error ? (
                    <div className='flex items-center gap-1 text-destructive'>
                      <AlertCircle className='h-3 w-3' />
                      <span>{item.error}</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <span>{formatFileSizeMb(item.file.size)}</span>
                      {isUploading ? (
                        <span className='flex items-center gap-1 text-muted-foreground'>
                          <Loader2 className='h-3 w-3 animate-spin' />
                          Uploading...
                        </span>
                      ) : (
                        <span className='flex items-center gap-1 text-green-600 dark:text-green-500'>
                          <CheckCircle className='h-3 w-3' />
                          Ready
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!item.error && isUploading ? (
                  <Progress value={66} className='mt-2 h-1' />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          items.length > 0 && 'border-muted-foreground/25',
          (disabled || isUploading) && 'pointer-events-none opacity-50',
        )}
        onDragOver={event => {
          event.preventDefault()
          if (!disabled && !isUploading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setIsDragging(false)
          handleSelectedFiles(event.dataTransfer.files)
        }}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          multiple={multiple}
          accept={accept}
          disabled={disabled || isUploading}
          onChange={event => handleSelectedFiles(event.target.files)}
        />

        <div className='flex flex-col items-center justify-center gap-2'>
          <div className='rounded-full bg-muted p-3'>
            <Upload className='h-4 w-4 text-muted-foreground' />
          </div>
          <div className='text-sm font-medium'>
            {isDragging ? 'Drop files here' : dropzoneTitle}
          </div>
          <div className='text-sm text-muted-foreground'>
            or <span className='font-medium text-primary'>browse files</span>
          </div>
          <div className='mt-2 text-xs text-muted-foreground'>{hint}</div>
        </div>
      </div>
    </div>
  )
}
