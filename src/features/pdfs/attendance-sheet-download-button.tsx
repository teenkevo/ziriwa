'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import AttendanceSheet from './attendance-sheet'
import type { Meeting } from '@/sanity/lib/meetings/get-all-meeting-minutes'
import type { MeetingAttendanceRecord } from '@/sanity/lib/meetings/get-attendance-by-meeting'
import type { MemberForAttendance } from '@/sanity/lib/members/get-members-for-attendance'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

const AttendanceSheetDownloadButton = ({
  meeting,
  members,
}: {
  meeting: Meeting
  members: MemberForAttendance[]
}) => {
  const [attendance, setAttendance] = useState<MeetingAttendanceRecord[] | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/meetings/${meeting._id}/attendance`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setAttendance(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setAttendance([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [meeting._id])

  const handleClick = useCallback(async () => {
    if (!attendance) return
    let qrDataUrl: string | undefined
    if (meeting.attendanceVerificationId) {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_BASE_URL || ''
      const verifyUrl = `${baseUrl}/verify/attendance/${meeting.attendanceVerificationId}`
      qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 })
    }
    const documentNode = (
      <AttendanceSheet
        meeting={meeting}
        attendance={attendance}
        members={members}
        qrDataUrl={qrDataUrl}
      />
    )
    const blob = await pdf(documentNode).toBlob()
    const dateStr = meeting.meetingDate
      ? new Date(meeting.meetingDate).toISOString().slice(0, 10)
      : 'unknown'
    const fileName = `Attendance-Sheet-${meeting.title.replace(/\s+/g, '-')}-${dateStr}.pdf`

    const blobURL = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobURL
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobURL)
  }, [meeting, attendance, members])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading attendance…</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-muted transition-colors w-full text-left"
    >
      <span className="flex items-center gap-2">
        <Image
          src="/pdf.png"
          alt="Download PDF"
          width={16}
          height={16}
          className="h-6 w-6"
        />
        <span className="truncate">Attendance sheet (PDF)</span>
      </span>
    </button>
  )
}

export default AttendanceSheetDownloadButton
