import React from 'react'
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  PDFDownloadLink,
} from '@react-pdf/renderer'
import { MEMBER_BY_ID_QUERYResult } from '../../../sanity.types'

// Register SpaceGrotesk (same as before)
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
    fontSize: 12,
    lineHeight: 1.6,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  receiptTitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
    fontSize: 10,
  },
  label: {
    fontWeight: 700,
    fontSize: 10,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  colDate: {
    width: 100,
    fontSize: 10,
  },
  colDesc: {
    flex: 1,
    paddingHorizontal: 4,
    fontSize: 10,
  },
  colAmount: {
    width: 100,
    textAlign: 'right' as const,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#555',
  },
})

const PaymentsTableReceipt = ({
  payments,
  member,
  year,
}: {
  payments: MEMBER_BY_ID_QUERYResult[number]['payments']
  member: MEMBER_BY_ID_QUERYResult[number]
  year: string
}) => {
  // Format “Issued Date” once
  const formattedIssuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Compute total
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0)

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>PHOENIX INVESTMENT CLUB</Text>
          <Text style={styles.receiptTitle}>Payment History</Text>
          {/* <Text>Issued on: {formattedIssuedDate}</Text> */}
          <Text>
            Investment payments for {year === 'all' ? 'All Investments' : year}
          </Text>
        </View>

        {/* Member Info */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Member Number:{' '}
            <Text style={{ fontWeight: 'normal' }}>{member.memberId}</Text>
          </Text>
          <Text style={styles.label}>
            Name:{' '}
            <Text style={{ fontWeight: 'normal' }}>{member.fullName}</Text>
          </Text>
          <Text style={styles.label}>
            Email: <Text style={{ fontWeight: 'normal' }}>{member.email}</Text>
          </Text>
          <Text style={styles.label}>
            Phone: <Text style={{ fontWeight: 'normal' }}>{member.phone}</Text>
          </Text>
        </View>

        {/* Table Header */}
        <View style={[styles.section, styles.tableHeader]}>
          <Text style={[styles.colDate, { fontWeight: 'bold' }]}>Date</Text>
          <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>
            Description
          </Text>
          <Text style={[styles.colAmount, { fontWeight: 'bold' }]}>
            Amount (UGX)
          </Text>
        </View>

        {/* Map Over Payments */}
        {payments.map(payment => {
          const formattedPaymentDate = new Date(
            payment.paymentDate || '',
          ).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          return (
            <View style={styles.tableRow} key={payment._id}>
              <Text style={styles.colDate}>{formattedPaymentDate}</Text>
              <Text style={styles.colDesc}>{payment.description}</Text>
              <Text style={styles.colAmount}>
                {payment.amountPaid?.toLocaleString()}
              </Text>
            </View>
          )
        })}

        {/* Totals Row */}
        <View style={[styles.section, styles.row]}>
          <Text style={{ flex: 1, fontWeight: 'bold' }}>Total Paid:</Text>
          <Text style={{ width: 100, textAlign: 'right', fontWeight: 'bold' }}>
            {totalPaid.toLocaleString()}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your continued support. For questions, contact the club
          treasurer.
        </Text>
      </Page>
    </Document>
  )
}

export default PaymentsTableReceipt
