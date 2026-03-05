import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getAllPositions = async (year?: number) => {
  const filter = year ? `&& committeeYear == ${year}` : ''

  const ALL_POSITIONS_QUERY = defineQuery(`
    *[_type == "position" ${filter}] | order(committeeYear desc, title asc) {
      _id,
      title,
      description,
      committeeYear,
      isActive,
      "nominations": *[
        _type == "nomination"
        && position._ref == ^._id
      ] {
        _id,
        status,
        nominee->{
          _id,
          fullName,
          memberId,
        },
        nominatedBy->{
          _id,
          fullName,
        },
      },
    }
  `)

  try {
    const positions = await sanityFetch({
      query: ALL_POSITIONS_QUERY,
      revalidate: 0,
    })

    return positions || []
  } catch (error) {
    console.error('Error fetching all positions', error)
    return []
  }
}
