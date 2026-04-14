'use client'

import * as React from 'react'

export type AppBreadcrumbItem = {
  label: string
  href?: string
}

type Ctx = {
  items: AppBreadcrumbItem[]
  setItems: (items: AppBreadcrumbItem[]) => void
}

const AppBreadcrumbContext = React.createContext<Ctx | null>(null)

export function AppBreadcrumbProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [items, setItems] = React.useState<AppBreadcrumbItem[]>([])
  const setItemsStable = React.useCallback((next: AppBreadcrumbItem[]) => {
    setItems(next)
  }, [])
  return (
    <AppBreadcrumbContext.Provider
      value={{ items, setItems: setItemsStable }}
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
