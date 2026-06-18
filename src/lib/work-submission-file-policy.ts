const WORK_SUBMISSION_MAX_MB = 10

export const WORK_SUBMISSION_MAX_BYTES = WORK_SUBMISSION_MAX_MB * 1024 * 1024

/** Value for `<input accept>` and `FileUpload accept`. */
export const WORK_SUBMISSION_FILE_ACCEPT =
  'application/pdf,.pdf,' +
  'application/msword,.doc,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,' +
  'application/vnd.ms-excel,.xls,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,' +
  'application/vnd.ms-powerpoint,.ppt,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,' +
  'image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp,image/gif,.gif,' +
  'text/plain,.txt,text/csv,.csv,application/zip,.zip'

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'txt',
  'csv',
  'zip',
])

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/zip',
])

function fileExtension(filename: string): string | null {
  const parts = filename.trim().toLowerCase().split('.')
  if (parts.length < 2) return null
  return parts.at(-1) ?? null
}

export function isAllowedWorkSubmissionFile(file: Pick<File, 'name' | 'type'>): boolean {
  const mime = file.type.trim().toLowerCase()
  if (mime && ALLOWED_MIME_TYPES.has(mime)) return true

  const ext = fileExtension(file.name)
  return ext != null && ALLOWED_EXTENSIONS.has(ext)
}

export function getWorkSubmissionFileError(
  file: Pick<File, 'name' | 'type' | 'size'>,
): string | null {
  if (!isAllowedWorkSubmissionFile(file)) {
    return 'File type not supported. Use PDF, Office documents, images, CSV, TXT, or ZIP.'
  }
  if (file.size > WORK_SUBMISSION_MAX_BYTES) {
    return `File must be ${WORK_SUBMISSION_MAX_MB}MB or less.`
  }
  return null
}

export function isPdfEvidenceFile(input: {
  mimeType?: string | null
  originalFilename?: string | null
}): boolean {
  const mime = input.mimeType?.trim().toLowerCase()
  if (mime === 'application/pdf') return true
  return input.originalFilename?.toLowerCase().endsWith('.pdf') ?? false
}

export const WORK_SUBMISSION_UPLOAD_PURPOSE = 'work-submission' as const
