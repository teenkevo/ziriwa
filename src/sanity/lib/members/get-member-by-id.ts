import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getMemberById = async (memberId: string) => {
  const MEMBER_BY_ID_QUERY = defineQuery(`
    *[_type == "member" && _id == $memberId] | order(fullName asc) {
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
    const member = await sanityFetch({
      query: MEMBER_BY_ID_QUERY,
      params: { memberId },
      tags: [`member-${memberId}`, 'members'],
    })

    // return data or empty array if no data is found
    return member || []
  } catch (error) {
    console.error('Error fetching member by id', error)
    return []
  }
}
