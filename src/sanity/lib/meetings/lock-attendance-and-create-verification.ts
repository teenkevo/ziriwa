import 'server-only'
import { writeClient } from '../write-client'

export async function lockAttendanceAndCreateVerification(
  meetingId: string,
): Promise<{ verificationId: string }> {
  const now = new Date().toISOString()

  const verificationDoc = await writeClient.create({
    _type: 'attendanceVerification',
    meeting: { _type: 'reference', _ref: meetingId },
    generatedAt: now,
  })

  await writeClient
    .patch(meetingId)
    .set({
      attendanceLockedAt: now,
      attendanceVerificationId: verificationDoc._id,
    })
    .commit()

  return { verificationId: verificationDoc._id }
}
