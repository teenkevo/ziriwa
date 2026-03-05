import React from 'react'
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import type { Meeting } from '@/sanity/lib/meetings/get-all-meeting-minutes'
import type { MeetingAttendanceRecord } from '@/sanity/lib/meetings/get-attendance-by-meeting'
import type { MemberForAttendance } from '@/sanity/lib/members/get-members-for-attendance'

Font.register({
  family: 'SpaceGrotesk',
  fonts: [
    {
      src: 'https://getlab.b-cdn.net/SpaceGrotesk-Light.ttf',
      fontWeight: 300,
    },
    {
      src: 'https://getlab.b-cdn.net/SpaceGrotesk-Regular.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://getlab.b-cdn.net/SpaceGrotesk-Medium.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://getlab.b-cdn.net/SpaceGrotesk-Bold.ttf',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'SpaceGrotesk',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
  header: {
    marginBottom: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetTitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  meetingInfo: {
    fontSize: 10,
    color: '#555',
    marginBottom: 16,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  col1: { width: '35%' },
  col2: { width: '15%' },
  col3: { width: '20%' },
  col4: { width: '30%' },
  headerText: {
    fontWeight: 700,
    fontSize: 9,
  },
  cellText: {
    fontSize: 9,
  },
  statusCaps: {
    textTransform: 'capitalize',
  },
  qrContainer: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    alignItems: 'center',
  },
  qrImage: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  qrLabel: {
    fontSize: 8,
    color: '#666',
  },
})

const AttendanceSheet = ({
  meeting,
  attendance,
  members,
  qrDataUrl,
}: {
  meeting: Meeting
  attendance: MeetingAttendanceRecord[]
  members: MemberForAttendance[]
  qrDataUrl?: string
}) => {
  const attendanceByMember = new Map(
    attendance.map(a => [a.member._id, a.status]),
  )

  const rows = members.map(m => ({
    ...m,
    status: attendanceByMember.get(m._id) ?? 'absent',
  }))

  const formattedDate = meeting.meetingDate
    ? new Date(meeting.meetingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>PHOENIX INVESTMENT CLUB</Text>
          <Text style={styles.sheetTitle}>Attendance Sheet</Text>
          <Text style={styles.meetingInfo}>
            {meeting.title} • {formattedDate}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.col1]}>Name</Text>
            <Text style={[styles.headerText, styles.col2]}>Member ID</Text>
            <Text style={[styles.headerText, styles.col3]}>Status</Text>
            <Text style={[styles.headerText, styles.col4]}>Signature</Text>
          </View>
          {rows.map((row, i) => (
            <View key={row._id} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.col1]}>{row.fullName}</Text>
              <Text style={[styles.cellText, styles.col2]}>{row.memberId}</Text>
              <Text
                style={[
                  styles.cellText,
                  styles.col3,
                  styles.statusCaps,
                ]}
              >
                {row.status}
              </Text>
              <Text style={[styles.cellText, styles.col4]} />
            </View>
          ))}
        </View>
        {qrDataUrl && (
          <View style={styles.qrContainer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrDataUrl} style={styles.qrImage} />
            <Text style={styles.qrLabel}>Scan to verify</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export default AttendanceSheet
