import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getAllResolutions = async () => {
  const ALL_RESOLUTIONS_QUERY = defineQuery(`
    *[_type == "resolution"] | order(createdAt desc) {
      _id,
      title,
      description,
      resolutionType,
      committeeYear,
      meetingDate,
      status,
      createdAt,
      createdBy->{
        _id,
        fullName,
        memberId,
      },
      positions[]->{
        _id,
        title,
        description,
        committeeYear,
        isActive,
      },
      "votes": *[
        _type == "vote" 
        && references(^._id)
      ] {
        _id,
        voteType,
        votedAt,
        voter->{
          _id,
          fullName,
          memberId,
        },
        nomination->{
          _id,
          nominee->{
            _id,
            fullName,
          },
          position->{
            _id,
            title,
          },
        },
      },
      "nominations": *[
        _type == "nomination"
        && acceptedForVoting == true
        && position._ref in ^.positions[]._ref
      ] {
        _id,
        status,
        acceptedForVoting,
        nominee->{
          _id,
          fullName,
          memberId,
        },
        position->{
          _id,
          title,
        },
        nominatedBy->{
          _id,
          fullName,
        },
      },
    }
  `)

  try {
    const resolutions = await sanityFetch({
      query: ALL_RESOLUTIONS_QUERY,
      revalidate: 0,
      tags: ['resolutions'],
    })

    return resolutions || []
  } catch (error) {
    console.error('Error fetching all resolutions', error)
    return []
  }
}
