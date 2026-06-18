import Image from 'next/image'
import { File as FileIcon } from 'lucide-react'

import { isPdfEvidenceFile } from '@/lib/work-submission-file-policy'

interface EvidenceFileIconProps {
  mimeType?: string | null
  originalFilename?: string | null
  className?: string
}

export function EvidenceFileIcon({
  mimeType,
  originalFilename,
  className = 'shrink-0 rounded',
}: EvidenceFileIconProps) {
  if (isPdfEvidenceFile({ mimeType, originalFilename })) {
    return (
      <Image
        src='/pdf.png'
        alt=''
        width={28}
        height={28}
        className={className}
      />
    )
  }

  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded bg-muted ${className ?? ''}`}
    >
      <FileIcon className='h-4 w-4 text-muted-foreground' aria-hidden />
    </div>
  )
}
