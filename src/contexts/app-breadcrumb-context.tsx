'use client'

import * as React from 'react'

export type AppBreadcrumbItem = {
  label: string
  href?: string
}

export type AppHeaderIdentity = {
  roleLabel: string
  sectionLabel: string
  separator?: '|' | '-'
}

type Ctx = {
  items: AppBreadcrumbItem[]
  headerIdentity: AppHeaderIdentity | null
  setItems: (items: AppBreadcrumbItem[]) => void
  setHeaderIdentity: (identity: AppHeaderIdentity | null) => void
}

const AppBreadcrumbContext = React.createContext<Ctx | null>(null)

export function AppBreadcrumbProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [items, setItems] = React.useState<AppBreadcrumbItem[]>([])
  const [headerIdentity, setHeaderIdentity] =
    React.useState<AppHeaderIdentity | null>(null)
  const setItemsStable = React.useCallback((next: AppBreadcrumbItem[]) => {
    setItems(next)
  }, [])
  const setHeaderIdentityStable = React.useCallback(
    (next: AppHeaderIdentity | null) => {
      setHeaderIdentity(next)
    },
    [],
  )
  return (
    <AppBreadcrumbContext.Provider
      value={{
        items,
        headerIdentity,
        setItems: setItemsStable,
        setHeaderIdentity: setHeaderIdentityStable,
      }}
    >
      {children}
    </AppBreadcrumbContext.Provider>
  )
}

export function useAppBreadcrumb() {
  const ctx = React.useContext(AppBreadcrumbContext)
  if (!ctx) {
    throw new Error(
      'useAppBreadcrumb must be used within AppBreadcrumbProvider',
    )
  }
  return ctx
}

/** Registers breadcrumb items for the current page; clears on unmount. */
export function useRegisterPageBreadcrumbs(items: AppBreadcrumbItem[]) {
  const { setItems } = useAppBreadcrumb()
  const serialized = JSON.stringify(items)
  React.useEffect(() => {
    setItems(JSON.parse(serialized) as AppBreadcrumbItem[])
    return () => setItems([])
  }, [serialized, setItems])
}

/** Registers the role/section label shown in the app header; clears on unmount. */
export function useRegisterHeaderIdentity(identity: AppHeaderIdentity | null) {
  const { setHeaderIdentity } = useAppBreadcrumb()
  const serialized = JSON.stringify(identity)
  React.useEffect(() => {
    setHeaderIdentity(
      JSON.parse(serialized) as AppHeaderIdentity | null,
    )
    return () => setHeaderIdentity(null)
  }, [serialized, setHeaderIdentity])
}
