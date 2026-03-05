import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface AttendanceVerificationResult {
  _id: string
  meeting: {
    _id: string
    title: string
    meetingDate: string
  }
  generatedAt: string
}

export async function getAttendanceVerificationById(
  verificationId: string,
): Promise<AttendanceVerificationResult | null> {
  const query = defineQuery(`
    *[_type == "attendanceVerification" && _id == $verificationId][0] {
      _id,
      meeting->{
        _id,
        title,
        meetingDate
      },
      generatedAt
    }
  `)

  try {
    const result = (await sanityFetch({
      query,
      params: { verificationId },
      revalidate: 0,
    })) as AttendanceVerificationResult | null
    return result
  } catch (error) {
    console.error('Error fetching attendance verification', error)
    return null
  }
}
