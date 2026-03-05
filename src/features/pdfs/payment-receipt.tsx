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

// For a custom TTF font:
// Register font
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
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    alignSelf: 'center',
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

const PaymentReceipt = ({
  payment,
  member,
}: {
  payment: MEMBER_BY_ID_QUERYResult[number]['payments'][number]
  member: MEMBER_BY_ID_QUERYResult[number]
}) => {
  // Destructure the payment object
  const {
    _id,
    paymentDate, // e.g. “2025-06-01”
    amountPaid, // e.g. 150.0
    year,
    month,
    description, // e.g. “Monthly membership dues”
  } = payment

  const formattedIssuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedPaymentDate = new Date(paymentDate || '').toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* If you registered a logo, use <Image> */}
          {/* <Image style={styles.logo} src={logo} /> */}
          <Text style={styles.companyName}>PHOENIX INVESTMENT CLUB</Text>
          <Text style={styles.receiptTitle}>Payment Receipt</Text>
        </View>

        {/* Payment Details Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Receipt Number - {_id.toUpperCase()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Member Number:</Text>
          <Text>{member.memberId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date of Payment:</Text>
          <Text>{formattedPaymentDate}</Text>
        </View>

        {/* Payer Information */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <Text style={styles.label}>Bill To:</Text>
          <Text>{member.fullName}</Text>
          <Text>{member.email}</Text>
          <Text>{member.phone}</Text>
        </View>

        {/* Line Items / Description */}
        <View
          style={[
            styles.section,
            {
              marginTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#eee',
              paddingTop: 10,
            },
          ]}
        >
          <View style={styles.row}>
            <Text style={{ flex: 1, fontWeight: 'bold' }}>Description</Text>
            <Text
              style={{ width: 100, fontWeight: 'bold', textAlign: 'right' }}
            >
              Amount
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{description}</Text>
            <Text style={{ width: 100, textAlign: 'right' }}>
              UGX {amountPaid?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Method & Total */}
        <View style={[styles.section, { marginTop: 20 }]}>
          {/* <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text>{method}</Text>
          </View> */}
          <View style={[styles.row, { marginTop: 5 }]}>
            <Text style={styles.label}>Total Paid:</Text>
            <Text>UGX {amountPaid?.toLocaleString()}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your payment. If you have any questions, please contact
          the club treasurer.
        </Text>
      </Page>
    </Document>
  )
}

export default PaymentReceipt
