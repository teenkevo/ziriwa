import { cookies } from 'next/headers'
import { getAllDivisions } from '@/sanity/lib/divisions/get-all-divisions'
import { getAssistantCommissioners } from '@/sanity/lib/staff/get-assistant-commissioners'
import DivisionSwitcher from './division-switcher'
import { DIVISION_COOKIE_NAME, getDefaultDivisionSlug } from '@/lib/division'

export async function DivisionSwitcherWrapper() {
  const [divisions, assistantCommissioners, cookieStore] = await Promise.all([
    getAllDivisions(),
    getAssistantCommissioners(),
    cookies(),
  ])

  const selectedSlug =
    cookieStore.get(DIVISION_COOKIE_NAME)?.value ||
    divisions.find(d => d.isDefault)?.slug?.current ||
    getDefaultDivisionSlug()

  return (
    <DivisionSwitcher
      divisions={divisions}
      assistantCommissioners={assistantCommissioners}
      selectedSlug={selectedSlug}
      className='hidden md:flex'
    />
  )
}
