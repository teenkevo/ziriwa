export const ASSESSMENT_EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

export const ASSESSMENT_EXCEL_MAX_BYTES = 10 * 1024 * 1024

export function isAssessmentExcelFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  )
}

export function getAssessmentExcelFileError(file: File): string | null {
  if (!isAssessmentExcelFile(file)) {
    return 'Only Excel files (.xlsx or .xls) are accepted'
  }
  if (file.size > ASSESSMENT_EXCEL_MAX_BYTES) {
    return 'Excel file must be 10MB or smaller'
  }
  return null
}
