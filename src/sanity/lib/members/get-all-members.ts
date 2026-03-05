import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getAllMembers = async () => {
  const ALL_MEMBERS_QUERY = defineQuery(`
    *[_type == "member"] | order(fullName asc) {
      _id,
      fullName,
      phone,
      email,
      memberId,
      status,
      selectedTier->{
        _id,
        title,
        amount,
      },
      tierHistory[]{
        tier->{
          _id,
          title,
          amount,
        },
        year,
        dateAssigned,
      },
      "payments": *[
        _type == "payment" 
        && references(^._id)
      ] {
        _id,
        type,
        amountPaid,
        paymentDate,
        status,
        year,
        month,
        description,
        tier->{
          _id,
          title,
          amount,
        },
      }
    }
  `)

  try {
    const members = await sanityFetch({
      query: ALL_MEMBERS_QUERY,
      revalidate: 0,
    })

    // return data or empty array if no data is found
    return members || []
  } catch (error) {
    console.error('Error fetching all members', error)
    return []
  }
}
