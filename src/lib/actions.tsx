'use server'
import { ID, Query } from 'node-appwrite'
import { databases } from './appwrite.config'
import { parseStringify } from './utils'
import { writeClient } from '@/sanity/lib/write-client'
import { revalidateTag } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { getAllMembers } from '@/sanity/lib/members/get-all-members'

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
  APPWRITE_MEMBERSHIP_COLLECTION_ID: MEMBERSHIP_COLLECTION_ID,
  APPWRITE_GROUP_COLLECTION_ID: GROUP_COLLECTION_ID,
  APPWRITE_TIER_COLLECTION_ID: TIER_COLLECTION_ID,
} = process.env

// TODO: Add logic for checking if user exists
export const createUser = async ({
  id,
  email,
  fullName,
  phone,
  status,
}: CreateUserProps) => {
  try {
    const newUser = await databases.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        id,
        email,
        fullName,
        phone,
        status,
      },
    )
    return parseStringify(newUser)
  } catch (error) {
    console.log(error)
  }
}

export const createTransaction = async ({
  id,
  name,
  amount,
  method,
  category,
  dateTime,
  year,
}: Transaction) => {
  try {
    const newTransaction = await databases.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        id,
        name,
        amount,
        method,
        category,
        dateTime,
        year,
      },
    )
    return parseStringify(newTransaction)
  } catch (error) {
    console.log(error)
  }
}

export const getUsers = async () => {
  try {
    // First get the user's membership
    const groups = await databases.listDocuments(
      DATABASE_ID!,
      GROUP_COLLECTION_ID!,
    )
    return groups.documents[0].users
  } catch (error) {
    console.error('Error fetching users:', error)
    return null
  }
}

export const updateUserTransactions = async (
  documentId: string,
  newTransactions: Transaction[],
) => {
  try {
    // First fetch the current user document to get existing transactions
    const currentUser = await databases.getDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      documentId,
    )

    // Combine existing transactions with new ones
    const existingTransactions = currentUser.transactions || []
    const allTransactions = [...existingTransactions, ...newTransactions]

    // Update the user's transactions with the combined array
    const updatedUser = await databases.updateDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      documentId,
      {
        transactions: allTransactions,
      },
    )

    if (updatedUser) {
      return parseStringify(updatedUser)
    }

    console.warn('No user found with the given document ID.')
    return null
  } catch (error) {
    console.error('Error updating user transactions:', error)
    return null
  }
}

export async function sendUsersToSanity(users: User[]) {
  try {
    const results = await Promise.all(
      users.map(async user => {
        const { email, fullName, phone, status, memberId } = user
        const result = await writeClient.create({
          _type: 'member',
          fullName,
          phone,
          email,
          memberId,
          status: status === 'Active' ? 'active' : 'inactive',
          joinedDate: new Date('2021-01-01').toISOString().slice(0, 10),
        })
        return result
      }),
    )

    // const deleteAll = await writeClient.delete({
    //   query: `*[_type == "member"]`,
    // })

    revalidateTag('members', 'max')
    return { results, status: 'ok' }
  } catch (error) {
    console.error('Error sending users to Sanity:', error)
    return { error, status: 'error' }
  }
}

export async function sendPaymentsToSanity() {
  try {
    const tiers = [
      {
        id: '92a0c64c-8c04-4075-87ee-076c8863e2d2',
        amount: 50000,
      },
      {
        id: '3fe35691-2b63-4ecc-bade-843e683900ad',
        amount: 100000,
      },
      {
        id: 'c877b887-474d-43ab-a4a9-6385ee02b4d3',
        amount: 150000,
      },
      {
        id: '860d3a83-06d6-42f6-83e3-4f3a4188da2a',
        amount: 200000,
      },
      {
        id: 'fb16bddc-2efd-4aa0-aad0-f0ebb1a585c7',
        amount: 250000,
      },
      {
        id: '86ca313e-435e-45e6-b7bb-0843c9b59d74',
        amount: 3000,
      },
    ]

    const member = {
      id: 'FxYFGZdNeULpAKzzAwXBCj',
      completedMonths: 25,
      partialMonths: 0,
      tierAmount: 100000,
    }

    const tier = tiers.find(tier => tier.amount === member.tierAmount)

    const startDate = new Date(2021, 0, 1) // January 2021
    const type = 'investment'
    const amountPaid = tier?.amount
    const memberId = member.id
    const tierId = tier?.id as string
    const status = 'completed'
    const completedMonths = member.completedMonths
    const partialMonths = member.partialMonths

    const results = await Promise.all(
      Array.from({ length: completedMonths }, async (_, index) => {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(startDate.getMonth() + index)
        const month = paymentDate.toLocaleString('default', { month: 'short' })
        const year = paymentDate.getFullYear()
        const paymentMonthNumber = paymentDate.getMonth() + 1
        const result = await writeClient.create({
          _type: 'payment',
          member: {
            _type: 'reference',
            _ref: memberId,
          },
          tier: {
            _type: 'reference',
            _ref: tierId,
          },
          month: paymentMonthNumber,
          year: year,
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} for ${month} ${year}`,
          amountPaid,
          paymentDate: new Date().toISOString(),
          type,
          status,
        })
        return result
      }),
    )
    // const deleteAll = await writeClient.delete({
    //   query: `*[_type == "payment" && member._ref == "${memberId}" && type == "investment"]`,
    // })
    revalidateTag('payments', 'max')
    return { results, status: 'ok' }
  } catch (error) {
    console.error('Error sending payments to Sanity:', error)
    return { error, status: 'error' }
  }
}

/**
 * Updates a member's contribution tier for the current year.
 * - Moves the previous selectedTier to tierHistory if it exists and is different
 * - Updates selectedTier to the new tier
 * - Ensures tierHistory has an entry for the current year
 */
export async function updateMemberTierForCurrentYear(
  memberId: string,
  newTierId: string,
) {
  try {
    const currentYear = new Date().getFullYear()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD format

    // Fetch the current member document
    const member = await writeClient.fetch(
      `*[_type == "member" && _id == $memberId][0]`,
      { memberId },
    )

    if (!member) {
      return { error: 'Member not found', status: 'error' }
    }

    // Get current tierHistory and selectedTier
    const currentTierHistory = member.tierHistory || []
    const currentSelectedTier = member.selectedTier?._ref

    // Check if current year already has an entry in tierHistory
    const currentYearEntry = currentTierHistory.find(
      (entry: { year: number }) => entry.year === currentYear,
    )

    // Prepare the new tierHistory array
    let updatedTierHistory = [...currentTierHistory]

    // If there's an existing selectedTier that's different from the new one
    if (currentSelectedTier && currentSelectedTier !== newTierId) {
      // If current year doesn't have an entry, add the old tier to tierHistory for current year
      if (!currentYearEntry) {
        updatedTierHistory.push({
          tier: {
            _type: 'reference',
            _ref: currentSelectedTier,
          },
          year: currentYear,
          dateAssigned: today,
        })
      }
    }

    // Ensure the new tier is in tierHistory for the current year
    // If current year entry exists, update it; otherwise add it
    const newTierHistoryEntry = {
      tier: {
        _type: 'reference',
        _ref: newTierId,
      },
      year: currentYear,
      dateAssigned: today,
    }

    if (currentYearEntry) {
      // Update existing entry
      const yearEntryIndex = updatedTierHistory.findIndex(
        (entry: { year: number }) => entry.year === currentYear,
      )
      if (yearEntryIndex !== -1) {
        updatedTierHistory[yearEntryIndex] = newTierHistoryEntry
      }
    } else {
      // Add new entry
      updatedTierHistory.push(newTierHistoryEntry)
    }

    // Update the member document
    await writeClient
      .patch(memberId)
      .set({
        selectedTier: {
          _type: 'reference',
          _ref: newTierId,
        },
        tierHistory: updatedTierHistory,
      })
      .commit({ autoGenerateArrayKeys: true })

    // Revalidate relevant tags
    revalidateTag(`member-${memberId}`, 'max')
    revalidateTag('members', 'max')

    return { status: 'ok' }
  } catch (error) {
    console.error('Error updating member tier:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Creates a new loan application for a member
 */
export async function applyForLoan({
  memberId,
  amount,
  guarantorId,
  repaymentPlan,
  description,
}: {
  memberId: string
  amount: number
  guarantorId: string
  repaymentPlan: string
  description?: string
}) {
  try {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD format

    // Create the loan document
    const loan = await writeClient.create({
      _type: 'loan',
      member: {
        _type: 'reference',
        _ref: memberId,
      },
      amount,
      guarantor: {
        _type: 'reference',
        _ref: guarantorId,
      },
      repaymentPlan,
      interestRate: 2, // 2% interest rate
      status: 'pending',
      applicationDate: today,
      description: description || undefined,
    })

    // Revalidate relevant tags
    revalidateTag(`member-${memberId}`, 'max')
    revalidateTag('members', 'max')
    revalidateTag('loans', 'max')

    return { status: 'ok', loan }
  } catch (error) {
    console.error('Error creating loan application:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Creates a new position for executive committee
 */
export async function createPosition({
  title,
  description,
  committeeYear,
  isActive = true,
}: {
  title: string
  description?: string
  committeeYear: number
  isActive?: boolean
}) {
  try {
    const position = await writeClient.create({
      _type: 'position',
      title,
      description: description || undefined,
      committeeYear,
      isActive,
    })

    revalidateTag('positions', 'max')
    revalidateTag('resolutions', 'max')

    return { status: 'ok', position }
  } catch (error) {
    console.error('Error creating position:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Creates a new resolution
 */
export async function createResolution({
  title,
  description,
  resolutionType,
  committeeYear,
  meetingDate,
  positionIds,
  createdById,
}: {
  title: string
  description: string
  resolutionType: string
  committeeYear?: number
  meetingDate: string
  positionIds?: string[]
  createdById?: string
}) {
  try {
    const resolution = await writeClient.create({
      _type: 'resolution',
      title,
      description,
      resolutionType,
      committeeYear: committeeYear || undefined,
      meetingDate,
      status: 'draft',
      positions: positionIds
        ? positionIds.map(id => ({
            _type: 'reference',
            _ref: id,
          }))
        : undefined,
      createdBy: createdById
        ? {
            _type: 'reference',
            _ref: createdById,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    })

    revalidateTag('resolutions', 'max')

    return { status: 'ok', resolution }
  } catch (error) {
    console.error('Error creating resolution:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Creates a new nomination
 */
export async function createNomination({
  positionId,
  nomineeId,
  nominatedById,
  notes,
}: {
  positionId: string
  nomineeId: string
  nominatedById: string
  notes?: string
}) {
  try {
    // Check if the nominator has already nominated someone for this position
    // (Allow multiple people to nominate the same candidate, but one person can only nominate one person per role)
    const existingNominatorNomination = await writeClient.fetch(
      `*[_type == "nomination" && position._ref == $positionId && nominatedBy._ref == $nominatedById][0]`,
      { positionId, nominatedById },
    )

    if (existingNominatorNomination) {
      return {
        error:
          'You have already nominated someone for this position. You can only nominate one person per role.',
        status: 'error',
      }
    }

    const nomination = await writeClient.create({
      _type: 'nomination',
      position: {
        _type: 'reference',
        _ref: positionId,
      },
      nominee: {
        _type: 'reference',
        _ref: nomineeId,
      },
      nominatedBy: {
        _type: 'reference',
        _ref: nominatedById,
      },
      status: 'accepted',
      acceptedForVoting: true,
      nominationDate: new Date().toISOString().slice(0, 10),
      notes: notes || undefined,
    })

    revalidateTag('resolutions', 'max')
    revalidateTag('positions', 'max')

    return { status: 'ok', nomination }
  } catch (error) {
    console.error('Error creating nomination:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Accepts a nomination for voting
 */
export async function acceptNominationForVoting(nominationId: string) {
  try {
    await writeClient
      .patch(nominationId)
      .set({
        status: 'accepted',
        acceptedForVoting: true,
      })
      .commit()

    revalidateTag('resolutions', 'max')
    revalidateTag('positions', 'max')

    return { status: 'ok' }
  } catch (error) {
    console.error('Error accepting nomination:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Opens a resolution for voting
 */
export async function openResolutionForVoting(resolutionId: string) {
  try {
    await writeClient
      .patch(resolutionId)
      .set({
        status: 'open',
      })
      .commit()

    revalidateTag('resolutions', 'max')
    revalidateTag(`resolution-${resolutionId}`, 'max')

    return { status: 'ok' }
  } catch (error) {
    console.error('Error opening resolution for voting:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Closes a resolution
 */
export async function closeResolution(resolutionId: string) {
  try {
    await writeClient
      .patch(resolutionId)
      .set({
        status: 'closed',
      })
      .commit()

    revalidateTag('resolutions', 'max')
    revalidateTag(`resolution-${resolutionId}`, 'max')

    return { status: 'ok' }
  } catch (error) {
    console.error('Error closing resolution:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Casts a vote on a resolution
 */
export async function castVote({
  resolutionId,
  voterId,
  voteType,
  nominationId,
  notes,
}: {
  resolutionId: string
  voterId: string
  voteType: 'for' | 'against' | 'abstain'
  nominationId?: string
  notes?: string
}) {
  try {
    // Check if user has already voted
    const existingVotes = await writeClient.fetch(
      `*[_type == "vote" && resolution._ref == $resolutionId && voter._ref == $voterId]`,
      { resolutionId, voterId },
    )

    if (existingVotes && existingVotes.length > 0) {
      // Update existing vote
      const existingVote = existingVotes[0]
      await writeClient
        .patch(existingVote._id)
        .set({
          voteType,
          nomination: nominationId
            ? {
                _type: 'reference',
                _ref: nominationId,
              }
            : undefined,
          notes: notes || undefined,
          votedAt: new Date().toISOString(),
        })
        .commit()
    } else {
      // Create new vote
      await writeClient.create({
        _type: 'vote',
        resolution: {
          _type: 'reference',
          _ref: resolutionId,
        },
        voter: {
          _type: 'reference',
          _ref: voterId,
        },
        voteType,
        nomination: nominationId
          ? {
              _type: 'reference',
              _ref: nominationId,
            }
          : undefined,
        notes: notes || undefined,
        votedAt: new Date().toISOString(),
      })
    }

    revalidateTag('resolutions', 'max')
    revalidateTag(`resolution-${resolutionId}`, 'max')

    return { status: 'ok' }
  } catch (error) {
    console.error('Error casting vote:', error)
    return { error: String(error), status: 'error' }
  }
}

/**
 * Gets the current authenticated user's member ID by email
 * Maps Clerk user email to a member in the database
 */
export async function getCurrentUserMemberIdByEmail(
  email: string,
): Promise<string | null> {
  try {
    if (!email) {
      return null
    }

    // Get all members and find by email
    const members = await getAllMembers()
    const member = members.find(
      (m: { email?: string }) => m.email?.toLowerCase() === email.toLowerCase(),
    )

    return member?._id || null
  } catch (error) {
    console.error('Error getting current user member ID by email:', error)
    return null
  }
}

export async function deleteMeeting(meeting: {
  _id: string
  agenda?: { asset?: { _id?: string } }
  financials?: { asset?: { _id?: string } }
  minutes?: { asset?: { _id?: string } }
  attendanceVerificationId?: string
}) {
  const meetingId = meeting._id
  const assetIds: string[] = []
  if (meeting.agenda?.asset?._id) assetIds.push(meeting.agenda.asset._id)
  if (meeting.financials?.asset?._id)
    assetIds.push(meeting.financials.asset._id)
  if (meeting.minutes?.asset?._id) assetIds.push(meeting.minutes.asset._id)

  try {
    await writeClient
      .patch(meetingId)
      .unset(['agenda', 'financials', 'minutes'])
      .commit()

    for (const assetId of assetIds) {
      try {
        await writeClient.delete(assetId)
      } catch (err) {
        console.warn(`Failed to delete asset ${assetId}:`, err)
      }
    }

    if (meeting.attendanceVerificationId) {
      try {
        await writeClient.delete(meeting.attendanceVerificationId)
      } catch (err) {
        console.warn('Failed to delete attendance verification:', err)
      }
    }

    await writeClient.delete(meetingId)
    revalidateTag('meetings', 'max')
    return { status: 'ok' as const }
  } catch (error) {
    console.error('Error deleting meeting:', error)
    return { status: 'error' as const, error }
  }
}
