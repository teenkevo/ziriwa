'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ChevronRight, Landmark, PenLine } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export type AppSidebarDivision = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
}

const appraisalItems: { title: string; url: string; icon: typeof PenLine }[] =
  []

export function AppSidebarNav({
  divisions,
}: {
  divisions: AppSidebarDivision[]
}) {
  const pathname = usePathname()
  const [sectionDivisionId, setSectionDivisionId] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    const m = pathname.match(/^\/sections\/([^/]+)/)
    if (!m) {
      setSectionDivisionId(null)
      return
    }
    const slug = decodeURIComponent(m[1])
    const ac = new AbortController()
    fetch(`/api/sections/by-slug/${encodeURIComponent(slug)}`, {
      signal: ac.signal,
    })
      .then(r => {
        if (!r.ok) {
          setSectionDivisionId(null)
          return null
        }
        return r.json() as Promise<{ division?: { _id: string } | null }>
      })
      .then(data => {
        if (data?.division?._id) setSectionDivisionId(data.division._id)
        else if (data !== null) setSectionDivisionId(null)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setSectionDivisionId(null)
      })
    return () => ac.abort()
  }, [pathname])

  const departmentsNavActive =
    pathname === '/departments' || pathname.startsWith('/departments/')

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={departmentsNavActive}
                tooltip='Departments'
              >
                <Link href='/departments'>
                  <Landmark />
                  <span>Departments</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Collapsible defaultOpen className='group/collapsible'>
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] hover:bg-sidebar-accent/50 focus-visible:ring-2',
                '[&[data-state=open]>svg]:rotate-90',
              )}
            >
              Divisions
              <ChevronRight className='ml-auto size-4 shrink-0 transition-transform duration-200' />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {divisions.length === 0 ? (
                  <SidebarMenuItem>
                    <span className='block px-2 py-1.5 text-xs text-muted-foreground'>
                      No divisions yet
                    </span>
                  </SidebarMenuItem>
                ) : (
                  divisions.map(div => {
                    const href = `/divisions/${div.slug?.current ?? div._id}`
                    const label = div.fullName || div.name
                    const onDivisionRoute =
                      pathname === href || pathname.startsWith(`${href}/`)
                    const onSectionInThisDivision =
                      sectionDivisionId != null &&
                      sectionDivisionId === div._id
                    const active = onDivisionRoute || onSectionInThisDivision
                    return (
                      <SidebarMenuItem key={div._id}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={label}
                        >
                          <Link href={href}>
                            <Building2 />
                            <span className='truncate'>{label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

      <Collapsible defaultOpen className='group/collapsible'>
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] hover:bg-sidebar-accent/50 focus-visible:ring-2',
                '[&[data-state=open]>svg]:rotate-90',
              )}
            >
              Appraisal
              <ChevronRight className='ml-auto size-4 shrink-0 transition-transform duration-200' />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {appraisalItems.map(item => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.url)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          {/* <Icon /> */}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </SidebarContent>
  )
}
