import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getAllPaymentTiers = async () => {
  const ALL_PAYMENT_TIERS_QUERY = defineQuery(`
    *[_type == "paymentTier"] | order(amount asc) {
      _id,
      title,
      amount,
    }
  `)

  try {
    const tiers = await sanityFetch({
      query: ALL_PAYMENT_TIERS_QUERY,
      revalidate: 0,
    })

    // return data or empty array if no data is found
    return tiers || []
  } catch (error) {
    console.error('Error fetching payment tiers', error)
    return []
  }
}
