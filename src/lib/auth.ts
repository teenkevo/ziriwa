import { auth } from '@clerk/nextjs/server'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'

/**
 * Gets the current authenticated user's member ID from Clerk
 * Maps Clerk user email to a member in the database
 */
export async function getCurrentUserMemberId(): Promise<string | null> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    // Get the user's email from Clerk
    // Note: You may need to fetch the full user object if email is not in the auth() response
    // For now, we'll use a helper function to get member by Clerk user ID
    // This assumes you'll store the Clerk user ID in the member document or use email matching

    // Option 1: If you store Clerk user ID in member documents
    // You would query: *[_type == "member" && clerkUserId == $userId]

    // Option 2: Match by email (requires fetching user from Clerk)
    // For now, return null and let the calling code handle it
    // You can enhance this by storing Clerk user ID in member documents

    return null
  } catch (error) {
    console.error('Error getting current user member ID:', error)
    return null
  }
}

/**
 * Gets the current authenticated user's member object
 * Returns the full member document if found
 */
export async function getCurrentUserMember() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    // Fetch all members and find by email or stored Clerk user ID
    // This is a temporary solution - ideally you'd store Clerk user ID in member documents
    const members = await getAllMembers()

    // For now, return null - you'll need to implement the mapping logic
    // based on how you want to link Clerk users to members
    return null
  } catch (error) {
    console.error('Error getting current user member:', error)
    return null
  }
}
