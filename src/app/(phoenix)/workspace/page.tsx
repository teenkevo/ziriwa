import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { client } from '@/sanity/lib/client'

async function getViewerEmail() {
  const user = await currentUser()
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    ''
  )
    .trim()
    .toLowerCase()
}

async function getPrimarySectionHrefForViewer() {
  const email = await getViewerEmail()
  if (!email) return null

  const section = await client.fetch<{
    _id: string
    slug?: { current?: string }
  } | null>(
    /* groq */ `*[_type == "staff" && lower(email) == $email && status == "active" && defined(section._ref)][0].section->{
      _id,
      slug
    }`,
    { email },
  )

  const sectionKey = section?.slug?.current ?? section?._id
  return sectionKey ? `/sections/${sectionKey}` : null
}

export default async function WorkspacePage() {
  if (await isSuperadmin()) {
    redirect('/departments')
  }

  const role = await getAppRole()

  if (role === 'assistant_commissioner') {
    redirect('/assistant-commissioner/dashboard')
  }

  if (role === 'commissioner') {
    redirect('/commissioner/dashboard')
  }

  if (role === 'manager') {
    redirect('/manager/dashboard')
  }

  if (role === 'supervisor') {
    redirect('/supervisor/dashboard')
  }

  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  redirect('/departments')
}
