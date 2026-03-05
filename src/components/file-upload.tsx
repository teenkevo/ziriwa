'use client'

import { useState, useRef } from 'react'
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type FileWithPreview = {
  file: File
  preview?: string
  progress: number
  error?: string
  uploaded?: boolean
}

export function FileUpload({
  multiple = false,
  accept = '*',
  maxSize = 5,
  onFilesChange,
}: {
  multiple?: boolean
  accept?: string
  maxSize?: number
  onFilesChange?: (files: File[]) => void
}) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const isDuplicate = (candidate: File, list: FileWithPreview[]) =>
      list.some(
        f =>
          f.file.name === candidate.name &&
          f.file.size === candidate.size &&
          f.file.lastModified === candidate.lastModified,
      )

    const newFiles: FileWithPreview[] = []

    Array.from(selectedFiles).forEach(file => {
      if (isDuplicate(file, files) || isDuplicate(file, newFiles)) {
        return
      }

      if (file.size > maxSize * 1024 * 1024) {
        newFiles.push({
          file,
          progress: 100,
          error: `File exceeds ${maxSize}MB limit`,
        })
        return
      }

      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newFiles.push({
        file,
        preview,
        progress: 0,
      })
    })

    const updatedFiles = multiple ? [...files, ...newFiles] : newFiles
    setFiles(updatedFiles)

    if (onFilesChange) {
      onFilesChange(updatedFiles.filter(f => !f.error).map(f => f.file))
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    newFiles.forEach((fileData, index) => {
      if (fileData.error) return

      const simulateUpload = setInterval(() => {
        setFiles(prevFiles => {
          const updated = [...prevFiles]
          const fileIndex = multiple ? files.length + index : index

          if (updated[fileIndex] && updated[fileIndex].progress < 100) {
            updated[fileIndex].progress += 5
          } else if (updated[fileIndex]) {
            updated[fileIndex].uploaded = true
            clearInterval(simulateUpload)
          }

          return updated
        })
      }, 100)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileChange(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setFiles(prevFiles => {
      const updated = [...prevFiles]
      if (updated[index]?.preview) {
        URL.revokeObjectURL(updated[index].preview as string)
      }
      updated.splice(index, 1)

      if (onFilesChange) {
        onFilesChange(updated.filter(f => !f.error).map(f => f.file))
      }

      return updated
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  return (
    <div className='w-full space-y-4 pb-4'>
      {files.length > 0 && (
        <div className='space-y-3'>
          {files.map((fileData, index) => (
            <div
              key={index}
              className='flex items-center gap-3 p-3 border rounded-md bg-background'
            >
              <div className='shrink-0 w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-muted'>
                {fileData.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileData.preview}
                    alt={fileData.file.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <File className='w-5 h-5 text-muted-foreground' />
                )}
              </div>

              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium truncate'>
                    {fileData.file.name}
                  </p>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full'
                    onClick={e => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                  >
                    <X className='h-4 w-4' />
                    <span className='sr-only'>Remove file</span>
                  </Button>
                </div>

                <div className='text-xs text-muted-foreground'>
                  {fileData.error ? (
                    <div className='flex items-center gap-1 text-destructive'>
                      <AlertCircle className='h-3 w-3' />
                      <span>{fileData.error}</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <span>
                        {(fileData.file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      {fileData.uploaded ? (
                        <span className='flex items-center gap-1 text-green-500'>
                          <CheckCircle className='h-3 w-3' />
                          Uploaded
                        </span>
                      ) : (
                        <span>{fileData.progress}%</span>
                      )}
                    </div>
                  )}
                </div>

                {!fileData.error && !fileData.uploaded && (
                  <Progress value={fileData.progress} className='h-1 mt-1' />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-3 transition-colors cursor-pointer text-center',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          files.length > 0 && 'border-muted-foreground/25',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          type='file'
          ref={fileInputRef}
          className='hidden'
          multiple={multiple}
          accept={accept}
          onChange={e => handleFileChange(e.target.files)}
        />

        <div className='flex flex-row items-center justify-start gap-2'>
          <div className='p-3 rounded-full bg-muted'>
            <Upload className='w-3 h-3 text-muted-foreground' />
          </div>
          <div className='text-sm text-muted-foreground font-medium'>
            {isDragging ? 'Drop files here' : 'Add files here |'}
          </div>

          <div className='text-xs text-muted-foreground'>
            {multiple ? 'Upload multiple files up to ' : 'Max size: '}
            {maxSize}MB
          </div>
        </div>
      </div>
    </div>
  )
}
