import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

/**
 * Checks if an email exists in the members collection
 */
export const checkMemberEmail = async (email: string): Promise<boolean> => {
  const CHECK_EMAIL_QUERY = defineQuery(`
    *[_type == "member" && email == $email][0] {
      _id,
      email,
      fullName,
    }
  `)

  try {
    const member = await sanityFetch({
      query: CHECK_EMAIL_QUERY,
      params: { email },
      revalidate: 0,
    })

    return member ? true : false
  } catch (error) {
    return false
  }
}
