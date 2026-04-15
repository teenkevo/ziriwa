'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building, Building2, ChevronRight, Landmark } from 'lucide-react'

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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import type { SidebarDepartmentWithDivisions } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'

export function AppSidebarNav({
  departmentsTree,
}: {
  departmentsTree: SidebarDepartmentWithDivisions[]
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

  const autoOpenDeptIds = React.useMemo(() => {
    const ids = new Set<string>()
    const deptPath = pathname.match(/^\/departments\/([^/]+)/)
    if (deptPath?.[1]) {
      const slug = decodeURIComponent(deptPath[1])
      const d = departmentsTree.find(
        x => x.slug?.current === slug || x._id === slug,
      )
      if (d) ids.add(d._id)
    }
    const divPath = pathname.match(/^\/divisions\/([^/]+)/)
    if (divPath?.[1]) {
      const slug = decodeURIComponent(divPath[1])
      for (const d of departmentsTree) {
        if (
          d.divisions.some(
            div => div.slug?.current === slug || div._id === slug,
          )
        ) {
          ids.add(d._id)
          break
        }
      }
    }
    if (sectionDivisionId) {
      for (const d of departmentsTree) {
        if (d.divisions.some(div => div._id === sectionDivisionId)) {
          ids.add(d._id)
          break
        }
      }
    }
    return ids
  }, [pathname, departmentsTree, sectionDivisionId])

  const [openDeptIds, setOpenDeptIds] = React.useState<Set<string>>(
    () => new Set(),
  )

  React.useEffect(() => {
    setOpenDeptIds(prev => {
      const next = new Set(prev)
      autoOpenDeptIds.forEach(id => next.add(id))
      return next
    })
  }, [autoOpenDeptIds])

  const departmentsNavActive =
    pathname === '/departments' || pathname.startsWith('/departments/')

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Departments</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {departmentsTree.length === 0 ? (
              <SidebarMenuItem>
                <span className='block px-2 py-1.5 text-xs text-muted-foreground'>
                  No departments yet
                </span>
              </SidebarMenuItem>
            ) : (
              departmentsTree.map(dept => {
                const deptLabel = dept.fullName || dept.name
                const deptHref = `/departments/${dept.slug?.current ?? dept._id}`
                const deptPathMatch = pathname.match(/^\/departments\/([^/]+)/)
                const deptSlugFromPath = deptPathMatch?.[1]
                  ? decodeURIComponent(deptPathMatch[1])
                  : null
                const departmentLinkActive =
                  deptSlugFromPath != null &&
                  (dept.slug?.current === deptSlugFromPath ||
                    dept._id === deptSlugFromPath)

                return (
                  <Collapsible
                    key={dept._id}
                    open={openDeptIds.has(dept._id)}
                    onOpenChange={open => {
                      setOpenDeptIds(prev => {
                        const next = new Set(prev)
                        if (open) next.add(dept._id)
                        else next.delete(dept._id)
                        return next
                      })
                    }}
                    asChild
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={departmentLinkActive}
                        tooltip={deptLabel}
                      >
                        <Link href={deptHref}>
                          <Building />
                          <span className='truncate'>{deptLabel}</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction
                          className={cn(
                            'transition-transform data-[state=open]:rotate-90',
                          )}
                          aria-label={
                            openDeptIds.has(dept._id)
                              ? 'Collapse divisions'
                              : 'Expand divisions'
                          }
                        >
                          <ChevronRight />
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {dept.divisions.length === 0 ? (
                            <SidebarMenuSubItem>
                              <span className='block px-2 py-1 text-xs text-muted-foreground'>
                                No divisions
                              </span>
                            </SidebarMenuSubItem>
                          ) : (
                            dept.divisions.map(div => {
                              const href = `/divisions/${div.slug?.current ?? div._id}`
                              const label = div.fullName || div.name
                              const onDivisionRoute =
                                pathname === href ||
                                pathname.startsWith(`${href}/`)
                              const onSectionInThisDivision =
                                sectionDivisionId != null &&
                                sectionDivisionId === div._id
                              const active =
                                onDivisionRoute || onSectionInThisDivision
                              return (
                                <SidebarMenuSubItem key={div._id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={active}
                                    size='sm'
                                  >
                                    <Link href={href}>
                                      <span className='truncate'>{label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
