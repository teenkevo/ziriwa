import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type MeetingType = 'agm' | 'executive' | 'ordinary' | 'other'

export interface MeetingFileAsset {
  _id: string
  url: string
  originalFilename?: string
  extension?: string
  mimeType?: string
  size?: number
}

export interface MeetingFile {
  asset?: MeetingFileAsset
}

export interface MeetingAttendanceItem {
  member: {
    _id: string
    fullName: string
    memberId: string
  }
  status: 'present' | 'absent' | 'excused'
  excusedReason?: string
}

export interface Meeting {
  _id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  agenda?: MeetingFile
  financials?: MeetingFile
  minutes?: MeetingFile
  attendance?: MeetingAttendanceItem[]
  attendanceLockedAt?: string
  attendanceVerificationId?: string
}

export const getAllMeetings = async () => {
  const ALL_MEETINGS_QUERY = defineQuery(`
    *[_type in ["meeting" ]] | order(meetingDate desc) {
      _id,
      title,
      meetingType,
      meetingDate,
      agenda{
        asset->{
          _id,
          url,
          originalFilename,
          extension,
          mimeType,
          size
        }
      },
      financials{
        asset->{
          _id,
          url,
          originalFilename,
          extension,
          mimeType,
          size
        }
      },
      minutes{
        asset->{
          _id,
          url,
          originalFilename,
          extension,
          mimeType,
          size
        }
      },
      attendance[]{
        member->{
          _id,
          fullName,
          memberId
        },
        status,
        excusedReason
      },
      attendanceLockedAt,
      attendanceVerificationId
    }
  `)

  try {
    const minutes = await sanityFetch({
      query: ALL_MEETINGS_QUERY,
      revalidate: 0,
    })
    return minutes || []
  } catch (error) {
    console.error('Error fetching all meeting minutes', error)
    return []
  }
}
