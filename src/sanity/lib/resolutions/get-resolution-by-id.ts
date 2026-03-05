import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export const getResolutionById = async (id: string) => {
  const RESOLUTION_BY_ID_QUERY = defineQuery(`
    *[_type == "resolution" && _id == $id][0] {
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
      ] | order(votedAt desc) {
        _id,
        voteType,
        votedAt,
        notes,
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
        nominationDate,
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
    const resolution = await sanityFetch({
      query: RESOLUTION_BY_ID_QUERY,
      params: { id },
      revalidate: 0,
      tags: [`resolution-${id}`],
    })

    return resolution || null
  } catch (error) {
    console.error('Error fetching resolution by id', error)
    return null
  }
}
