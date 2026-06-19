'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/ui/file-upload'
import { Label } from '@/components/ui/label'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import {
  ASSESSMENT_EXCEL_ACCEPT,
  ASSESSMENT_EXCEL_MAX_BYTES,
  getAssessmentExcelFileError,
} from '@/lib/assessments/excel-file-policy'

interface ImportAssessmentContentProps {
  sectionId: string
  basePath: string
  dashboardHref: string
}

export function ImportAssessmentContent({
  sectionId,
  basePath,
  dashboardHref,
}: ImportAssessmentContentProps) {
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        { label: 'Manager', href: dashboardHref },
        { label: 'Assessments', href: basePath },
        { label: 'Import Excel' },
      ],
      [basePath, dashboardHref],
    ),
  )

  async function handleImport() {
    if (!file) {
      toast.error('Choose an Excel file to import')
      return
    }

    const fileError = getAssessmentExcelFileError(file)
    if (fileError) {
      toast.error(fileError)
      return
    }

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('sectionId', sectionId)
      formData.append('file', file)

      const res = await fetch('/api/assessments/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      toast.success(
        `Imported ${data.questionCount ?? 0} questions into "${data.title ?? 'assessment'}"`,
      )
      router.push(`${basePath}/${data.id as string}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to import assessment',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <header className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 md:px-6'>
        <div className='min-w-0 space-y-1'>
          <Button type='button' variant='ghost' size='sm' className='-ml-2' asChild>
            <Link href={basePath}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to assessments
            </Link>
          </Button>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Import assessment from Excel
          </h1>
          <p className='text-sm text-muted-foreground'>
            Upload a workbook with an Assessment sheet. The title is taken from
            the Summary sheet or the file name.
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <Button type='button' variant='outline' asChild disabled={isSaving}>
            <Link href={basePath}>Cancel</Link>
          </Button>
          <Button
            type='button'
            onClick={handleImport}
            disabled={isSaving || !file}
          >
            {isSaving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
            Import assessment
          </Button>
        </div>
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8'>
          <div className='space-y-2'>
            <Label className='text-xs' required>
              Excel file
            </Label>
            <FileUpload
              accept={ASSESSMENT_EXCEL_ACCEPT}
              maxSizeMb={ASSESSMENT_EXCEL_MAX_BYTES / (1024 * 1024)}
              files={file ? [file] : []}
              onFilesChange={files => {
                const nextFile = files[0]
                if (!nextFile) {
                  setFile(null)
                  return
                }
                const error = getAssessmentExcelFileError(nextFile)
                if (error) {
                  toast.error(error)
                  return
                }
                setFile(nextFile)
              }}
              disabled={isSaving}
              isUploading={isSaving}
              dropzoneTitle='Drag & drop your Excel file here'
              dropzoneHint='.xlsx or .xls up to 10MB'
            />
          </div>
        </div>
      </div>
    </div>
  )
}
