import * as XLSX from 'xlsx'

import type {
  AssessmentDifficulty,
  AssessmentQuestion,
  AssessmentQuestionType,
} from '@/lib/assessments/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

const HEADER_ALIASES: Record<string, string> = {
  'question id': 'questionId',
  subtopic: 'subtopic',
  difficulty: 'difficulty',
  'question type': 'questionType',
  'question description': 'title',
  'question body': 'body',
  'option a': 'optionA',
  'option b': 'optionB',
  'option c': 'optionC',
  'option d': 'optionD',
  'option e': 'optionE',
  'correct answer': 'correctAnswer',
  explanation: 'explanation',
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function cellString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function parseDifficulty(value: string): AssessmentDifficulty {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'beginner') return 'beginner'
  if (normalized === 'advanced') return 'advanced'
  if (normalized === 'expert') return 'expert'
  return 'intermediate'
}

function parseQuestionType(value: string): AssessmentQuestionType {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('multiple')) return 'multiple_choice'
  return 'single_choice'
}

function parseCorrectAnswers(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;/\s]+/)
        .map(part => part.trim().toUpperCase())
        .filter(part => OPTION_LABELS.includes(part as (typeof OPTION_LABELS)[number])),
    ),
  ].sort()
}

function rowToQuestion(
  row: Record<string, unknown>,
  rowNumber: number,
): AssessmentQuestion {
  const title = cellString(row.title)
  const body = cellString(row.body)
  if (!title || !body) {
    throw new Error(`Row ${rowNumber}: question description and body are required`)
  }

  const options = OPTION_LABELS.flatMap(label => {
    const text = cellString(row[`option${label}`])
    if (!text) return []
    return [{ _key: crypto.randomUUID(), label, text }]
  })

  if (options.length < 2) {
    throw new Error(`Row ${rowNumber}: at least two options are required`)
  }

  const correctAnswers = parseCorrectAnswers(cellString(row.correctAnswer))
  if (correctAnswers.length === 0) {
    throw new Error(`Row ${rowNumber}: correct answer is required`)
  }

  const questionType = parseQuestionType(cellString(row.questionType))
  if (questionType === 'single_choice' && correctAnswers.length !== 1) {
    throw new Error(
      `Row ${rowNumber}: single-choice questions must have exactly one correct answer`,
    )
  }

  return {
    _key: crypto.randomUUID(),
    questionId: cellString(row.questionId) || undefined,
    subtopic: cellString(row.subtopic) || undefined,
    difficulty: parseDifficulty(cellString(row.difficulty)),
    questionType,
    title,
    body,
    options,
    correctAnswers,
    explanation: cellString(row.explanation) || undefined,
  }
}

function sheetRowsToObjects(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
  if (matrix.length < 2) return []

  const headerRow = matrix[0] ?? []
  const fieldNames = headerRow.map(header => {
    const alias = HEADER_ALIASES[normalizeHeader(header)]
    return alias ?? normalizeHeader(header)
  })

  return matrix.slice(1).flatMap((row, index) => {
    const hasContent = row.some(cell => cellString(cell))
    if (!hasContent) return []

    const record: Record<string, unknown> = { __rowNumber: index + 2 }
    fieldNames.forEach((field, columnIndex) => {
      if (!field) return
      record[field] = row[columnIndex] ?? ''
    })
    return [record]
  })
}

function findAssessmentSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const preferred =
    workbook.Sheets.Assessment ??
    workbook.Sheets.assessment ??
    workbook.Sheets[workbook.SheetNames[0] ?? '']
  return preferred ?? null
}

function inferTitleFromWorkbook(workbook: XLSX.WorkBook, fallback: string): string {
  const summarySheet =
    workbook.Sheets.Summary ?? workbook.Sheets.summary ?? null
  if (!summarySheet) return fallback

  const firstCell = summarySheet.A1?.v
  const text = cellString(firstCell)
  if (!text) return fallback

  const cleaned = text.replace(/^assessment summary for\s+/i, '').trim()
  return cleaned || fallback
}

export function parseAssessmentExcel(
  buffer: ArrayBuffer,
  fallbackTitle = 'Imported assessment',
): { title: string; questions: AssessmentQuestion[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = findAssessmentSheet(workbook)
  if (!sheet) {
    throw new Error('No assessment sheet found in workbook')
  }

  const rows = sheetRowsToObjects(sheet)
  if (rows.length === 0) {
    throw new Error('Assessment sheet is empty')
  }

  const questions = rows.map(row => {
    const rowNumber = Number(row.__rowNumber ?? 0) || 0
    return rowToQuestion(row, rowNumber)
  })

  return {
    title: inferTitleFromWorkbook(workbook, fallbackTitle),
    questions,
  }
}
