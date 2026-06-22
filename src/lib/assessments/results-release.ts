export function areAssessmentResultsReleased(assessment: {
  resultsReleasedAt?: string
}): boolean {
  return Boolean(assessment.resultsReleasedAt)
}

export function maskAttemptScoresForOfficer<
  T extends {
    score?: number
    maxScore?: number
    percentScore?: number
  },
>(attempt: T | null, resultsReleased: boolean): T | null {
  if (!attempt || resultsReleased) return attempt
  return {
    ...attempt,
    score: undefined,
    maxScore: undefined,
    percentScore: undefined,
  }
}

export function maskOfficerSubmissionResponse(
  result: {
    id: string
    score?: number
    maxScore?: number
    percentScore?: number
    submittedAt?: string
    submissionReason?: string
    questionResults?: unknown
  },
  resultsReleased: boolean,
) {
  if (resultsReleased) return result
  return {
    id: result.id,
    submittedAt: result.submittedAt,
    submissionReason: result.submissionReason,
    resultsReleased: false,
  }
}
