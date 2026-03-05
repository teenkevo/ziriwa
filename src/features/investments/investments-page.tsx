'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/file-upload'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  FileText,
  Plus,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  FilePlus,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import type { Investment, InvestmentType } from '@/sanity/lib/investments/get-all-investments'
import { isFinancialInvestment } from '@/sanity/lib/investments/get-all-investments'
import type { FinancialInvestmentTransaction } from '@/sanity/lib/investments/get-financial-transactions'
import type { Property, PropertyType } from '@/sanity/lib/properties/get-all-properties'
import { PROPERTY_TYPE_LABELS } from '@/sanity/lib/properties/get-all-properties'
import type { PropertyTransaction } from '@/sanity/lib/properties/get-property-transactions'
import type { InvestmentStatement } from '@/sanity/lib/investments/get-investment-statements'

const PRODUCT_LABELS: Record<string, string> = {
  umbrella_trust_fund: 'Umbrella Trust Fund',
  dollar_fund: 'Dollar Fund',
  money_market_fund: 'Money Market Fund',
  balanced_fund: 'Balanced Fund',
}

const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  unit_trust: 'Unit Trust',
  bond: 'Bond',
  money_market: 'Money Market',
  other: 'Other',
}

type TabValue = 'financial' | 'property' | 'other'

interface InvestmentsPageProps {
  investments: Investment[]
  financialTransactions: FinancialInvestmentTransaction[]
  statements: InvestmentStatement[]
  properties: Property[]
  propertyTransactions: PropertyTransaction[]
}

type DepositFormValues = {
  amount: string
  date: string
  referenceNumber: string
  proofOfDepositFiles: File[]
}

type WithdrawalFormValues = {
  amount: string
  date: string
  referenceNumber: string
  redemptionFormFiles: File[]
}

type CreatePropertyFormValues = {
  name: string
  propertyType: PropertyType
  dateAcquired: string
  location: string
  plotNumber: string
  landTitleFiles: File[]
  documentFiles: File[]
}

type PropertyTransactionFormValues = {
  propertyId: string
  transactionType: 'purchase' | 'sale' | 'maintenance' | 'fees'
  amount: string
  date: string
  counterparty: string
  notes: string
  documentFiles: File[]
}

type StatementFormValues = {
  investmentId: string
  statementDate: string
  closingBalance: string
  interestEarned: string
  notes: string
  documentFiles: File[]
}

const PRODUCT_OPTIONS = [
  { title: 'Umbrella Trust Fund', value: 'umbrella_trust_fund' },
  { title: 'Dollar Fund', value: 'dollar_fund' },
  { title: 'Money Market Fund', value: 'money_market_fund' },
  { title: 'Balanced Fund', value: 'balanced_fund' },
] as const

type CreateInvestmentFormValues = {
  name: string
  investmentType: InvestmentType
  provider: string
  accountName: string
  product: string
  memberNumber: string
  accountNumber: string
}

const PROPERTY_TYPE_OPTIONS: { title: string; value: PropertyType }[] = [
  { title: 'Land', value: 'land' },
  { title: 'Apartment', value: 'apartment' },
  { title: 'House', value: 'house' },
  { title: 'Building', value: 'building' },
  { title: 'Other', value: 'other' },
]

export function InvestmentsPage({
  investments,
  financialTransactions,
  statements,
  properties,
  propertyTransactions,
}: InvestmentsPageProps) {
  const router = useRouter()
  const isDesktop =
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true

  const [selectedInvestment, setSelectedInvestment] =
    useState<Investment | null>(null)
  const [depositFormOpen, setDepositFormOpen] = useState(false)
  const [withdrawalFormOpen, setWithdrawalFormOpen] = useState(false)
  const [depositInvestment, setDepositInvestment] = useState<Investment | null>(
    null,
  )
  const [withdrawalInvestment, setWithdrawalInvestment] =
    useState<Investment | null>(null)
  const [propertyFormOpen, setPropertyFormOpen] = useState(false)
  const [statementFormOpen, setStatementFormOpen] = useState(false)
  const [createInvestmentOpen, setCreateInvestmentOpen] = useState(false)
  const [createPropertyOpen, setCreatePropertyOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [depositSubmitting, setDepositSubmitting] = useState(false)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [propertySubmitting, setPropertySubmitting] = useState(false)
  const [createPropertySubmitting, setCreatePropertySubmitting] = useState(false)
  const [statementSubmitting, setStatementSubmitting] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const grouped = useMemo(() => {
    const unitTrusts: Investment[] = []
    const other: Investment[] = []
    for (const inv of investments) {
      if (inv.investmentType === 'unit_trust') {
        unitTrusts.push(inv)
      } else {
        other.push(inv)
      }
    }
    return { unitTrusts, other }
  }, [investments])

  const financialTotalsByInvestment = useMemo(() => {
    const map: Record<
      string,
      { deposits: number; withdrawals: number; lastStatement?: InvestmentStatement }
    > = {}
    for (const inv of grouped.unitTrusts) {
      map[inv._id] = { deposits: 0, withdrawals: 0 }
    }
    for (const t of financialTransactions) {
      if (t.status === 'cancelled') continue
      const id = t.investment?._id
      if (!id || !map[id]) continue
      if (t.transactionType === 'deposit') {
        map[id].deposits += t.amount
      } else {
        map[id].withdrawals += t.amount
      }
    }
    for (const s of statements) {
      const id = s.investment?._id
      if (!id || !map[id]) continue
      if (!map[id].lastStatement || s.statementDate > map[id].lastStatement!.statementDate) {
        map[id].lastStatement = s
      }
    }
    return map
  }, [grouped.unitTrusts, financialTransactions, statements])

  const propertyTotalsByProperty = useMemo(() => {
    const map: Record<string, { purchases: number; sales: number; other: number }> = {}
    for (const p of properties) {
      map[p._id] = { purchases: 0, sales: 0, other: 0 }
    }
    for (const t of propertyTransactions) {
      if (t.status === 'cancelled') continue
      const id = t.property?._id
      if (!id || !map[id]) continue
      if (t.transactionType === 'purchase') map[id].purchases += t.amount
      else if (t.transactionType === 'sale') map[id].sales += t.amount
      else map[id].other += t.amount
    }
    return map
  }, [properties, propertyTransactions])

  const depositForm = useForm<DepositFormValues>({
    defaultValues: {
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      proofOfDepositFiles: [],
    },
  })

  const withdrawalForm = useForm<WithdrawalFormValues>({
    defaultValues: {
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      redemptionFormFiles: [],
    },
  })

  const createPropertyForm = useForm<CreatePropertyFormValues>({
    defaultValues: {
      name: '',
      propertyType: 'land',
      dateAcquired: new Date().toISOString().slice(0, 10),
      location: '',
      plotNumber: '',
      landTitleFiles: [],
      documentFiles: [],
    },
  })

  const propertyForm = useForm<PropertyTransactionFormValues>({
    defaultValues: {
      propertyId: '',
      transactionType: 'purchase',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      counterparty: '',
      notes: '',
      documentFiles: [],
    },
  })

  const statementForm = useForm<StatementFormValues>({
    defaultValues: {
      investmentId: '',
      statementDate: new Date().toISOString().slice(0, 10),
      closingBalance: '',
      interestEarned: '',
      notes: '',
      documentFiles: [],
    },
  })

  const createForm = useForm<CreateInvestmentFormValues>({
    defaultValues: {
      name: '',
      investmentType: 'unit_trust',
      provider: '',
      accountName: '',
      product: '',
      memberNumber: '',
      accountNumber: '',
    },
  })

  const handleDepositSubmit = async (values: DepositFormValues) => {
    const proofFile = values.proofOfDepositFiles?.[0]
    if (!proofFile) {
      toast.error('Proof of deposit is required')
      return
    }
    if (!depositInvestment) return
    setDepositSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('investmentId', depositInvestment._id)
      formData.append('transactionType', 'deposit')
      formData.append('amount', values.amount)
      formData.append('date', values.date)
      if (values.referenceNumber) formData.append('referenceNumber', values.referenceNumber)
      formData.append('proofOfDeposit', proofFile)

      const res = await fetch('/api/investments/financial-transaction', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to record deposit')
      }
      toast.success('Deposit recorded')
      setDepositFormOpen(false)
      setDepositInvestment(null)
      depositForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record deposit')
    } finally {
      setDepositSubmitting(false)
    }
  }

  const handleWithdrawalSubmit = async (values: WithdrawalFormValues) => {
    const redemptionFile = values.redemptionFormFiles?.[0]
    if (!redemptionFile) {
      toast.error('Redemption form is required')
      return
    }
    if (!withdrawalInvestment) return
    setWithdrawalSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('investmentId', withdrawalInvestment._id)
      formData.append('transactionType', 'withdrawal')
      formData.append('amount', values.amount)
      formData.append('date', values.date)
      if (values.referenceNumber) formData.append('referenceNumber', values.referenceNumber)
      formData.append('redemptionForm', redemptionFile)

      const res = await fetch('/api/investments/financial-transaction', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to record withdrawal')
      }
      toast.success('Withdrawal recorded')
      setWithdrawalFormOpen(false)
      setWithdrawalInvestment(null)
      withdrawalForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record withdrawal')
    } finally {
      setWithdrawalSubmitting(false)
    }
  }

  const handleCreateProperty = async (values: CreatePropertyFormValues) => {
    const landTitleFile = values.landTitleFiles?.[0]
    if (!landTitleFile) {
      toast.error('Land title is required')
      return
    }
    setCreatePropertySubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('propertyType', values.propertyType)
      formData.append('dateAcquired', values.dateAcquired)
      if (values.location) formData.append('location', values.location)
      if (values.plotNumber) formData.append('plotNumber', values.plotNumber)
      formData.append('landTitle', landTitleFile)
      ;(values.documentFiles || []).forEach((f) => formData.append('documents', f))

      const res = await fetch('/api/properties/create', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to create property')
      }
      toast.success('Property created')
      setCreatePropertyOpen(false)
      createPropertyForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create property')
    } finally {
      setCreatePropertySubmitting(false)
    }
  }

  const handlePropertySubmit = async (values: PropertyTransactionFormValues) => {
    const docs = values.documentFiles || []
    if (['purchase', 'sale'].includes(values.transactionType) && docs.length === 0) {
      toast.error('Supporting documents are required for purchase and sale')
      return
    }
    setPropertySubmitting(true)
    try {
      const formData = new FormData()
      formData.append('propertyId', values.propertyId)
      formData.append('transactionType', values.transactionType)
      formData.append('amount', values.amount)
      formData.append('date', values.date)
      if (values.counterparty) formData.append('counterparty', values.counterparty)
      if (values.notes) formData.append('notes', values.notes)
      docs.forEach((f) => formData.append('documents', f))

      const res = await fetch('/api/properties/transaction', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to create transaction')
      }
      toast.success('Transaction recorded')
      setPropertyFormOpen(false)
      propertyForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record transaction')
    } finally {
      setPropertySubmitting(false)
    }
  }

  const handleStatementSubmit = async (values: StatementFormValues) => {
    const docFile = values.documentFiles?.[0]
    if (!docFile) {
      toast.error('Statement document is required')
      return
    }
    setStatementSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('investmentId', values.investmentId)
      formData.append('statementDate', values.statementDate)
      if (values.closingBalance) formData.append('closingBalance', values.closingBalance)
      if (values.interestEarned) formData.append('interestEarned', values.interestEarned)
      if (values.notes) formData.append('notes', values.notes)
      formData.append('document', docFile)

      const res = await fetch('/api/investments/statement', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to upload statement')
      }
      toast.success('Statement uploaded')
      setStatementFormOpen(false)
      statementForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload statement')
    } finally {
      setStatementSubmitting(false)
    }
  }

  const handleCreateInvestment = async (values: CreateInvestmentFormValues) => {
    setCreateSubmitting(true)
    try {
      const res = await fetch('/api/investments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.investmentType === 'unit_trust' ? values.accountName : values.name,
          investmentType: values.investmentType,
          provider: values.provider || undefined,
          accountName: values.accountName || undefined,
          product: values.product || undefined,
          memberNumber: values.memberNumber || undefined,
          accountNumber: values.accountNumber || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to create investment')
      }
      toast.success('Investment created')
      setCreateInvestmentOpen(false)
      createForm.reset()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create investment')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const openDepositForm = (investment: Investment) => {
    setDepositInvestment(investment)
    depositForm.reset({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      proofOfDepositFiles: [],
    })
    setDepositFormOpen(true)
  }

  const openWithdrawalForm = (investment: Investment) => {
    setWithdrawalInvestment(investment)
    withdrawalForm.reset({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      redemptionFormFiles: [],
    })
    setWithdrawalFormOpen(true)
  }

  const openPropertyForm = (property?: Property) => {
    if (property) {
      propertyForm.setValue('propertyId', property._id)
    }
    setPropertyFormOpen(true)
  }

  const openStatementForm = (investment?: Investment) => {
    if (investment) {
      statementForm.setValue('investmentId', investment._id)
    }
    setStatementFormOpen(true)
  }

  const invTransactions =
    selectedInvestment && isFinancialInvestment(selectedInvestment.investmentType)
      ? financialTransactions.filter(
          t => t.investment?._id === selectedInvestment._id,
        )
      : []

  const invStatements =
    selectedInvestment && isFinancialInvestment(selectedInvestment.investmentType)
      ? statements.filter(s => s.investment?._id === selectedInvestment._id)
      : []

  const propTransactions =
    selectedProperty
      ? propertyTransactions.filter(
          t => t.property?._id === selectedProperty._id,
        )
      : []

  const renderPropertyCard = (prop: Property) => {
    const totals = propertyTotalsByProperty[prop._id]

    return (
      <Card
        key={prop._id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedProperty(prop)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">{prop.name}</CardTitle>
              <CardDescription className="mt-1 flex flex-col gap-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {PROPERTY_TYPE_LABELS[prop.propertyType] || prop.propertyType}
                  </Badge>
                  {prop.location && <span>{prop.location}</span>}
                </span>
                {prop.plotNumber && (
                  <span className="text-xs text-muted-foreground">
                    Plot: {prop.plotNumber}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {totals && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span>Purchases: UGX {totals.purchases.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span>Sales: UGX {totals.sales.toLocaleString()}</span>
              </div>
              {totals.other > 0 && (
                <div className="text-muted-foreground">
                  Other: UGX {totals.other.toLocaleString()}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => openPropertyForm(prop)}
            >
              <FilePlus className="h-3 w-3 mr-1" />
              Record transaction
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderInvestmentCard = (inv: Investment, tab: TabValue) => {
    const isFinancial = tab === 'financial'
    const financialTotals = financialTotalsByInvestment[inv._id]

    return (
      <Card
        key={inv._id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedInvestment(inv)}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                {inv.investmentType === 'unit_trust'
                  ? inv.accountName || inv.name
                  : inv.name}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-col gap-1">
                <span className="flex items-center gap-2 flex-wrap">
                  {inv.provider && <span>{inv.provider}</span>}
                  <Badge variant="outline" className="text-[10px]">
                    {INVESTMENT_TYPE_LABELS[inv.investmentType] || inv.investmentType}
                  </Badge>
                </span>
                {inv.investmentType === 'unit_trust' && (inv.accountNumber || inv.product) && (
                  <span className="text-xs text-muted-foreground">
                    {[
                      inv.product && (PRODUCT_LABELS[inv.product] ?? inv.product),
                      inv.accountNumber && `Acct: ${inv.accountNumber}`,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isFinancial && financialTotals && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2 text-green-600">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Deposits: UGX {financialTotals.deposits.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Withdrawals: UGX {financialTotals.withdrawals.toLocaleString()}</span>
              </div>
              {financialTotals.lastStatement?.closingBalance != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>
                    Last statement: UGX {financialTotals.lastStatement.closingBalance.toLocaleString()} ({financialTotals.lastStatement.statementDate})
                  </span>
                </div>
              )}
            </div>
          )}
          {isFinancial && (
            <div className="flex flex-wrap gap-2 pt-2" onClick={e => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-primary"
                onClick={() => openDepositForm(inv)}
              >
                <ArrowDownCircle className="h-3 w-3 mr-1" />
                Deposit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => openWithdrawalForm(inv)}
              >
                <ArrowUpCircle className="h-3 w-3 mr-1" />
                Withdrawal
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => openStatementForm(inv)}
              >
                <FilePlus className="h-3 w-3 mr-1" />
                Statement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderEmptyTab = (tab: TabValue, label: string) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="p-3 rounded-full bg-muted">
          {tab === 'financial' ? (
            <Landmark className="h-6 w-6 text-muted-foreground" />
          ) : tab === 'property' ? (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">No {label} investments yet</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Create an investment to start tracking deposits, withdrawals and
            statements.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateInvestmentOpen(true)}>
          Create investment
        </Button>
      </CardContent>
    </Card>
  )

  const depositFormContent = (
    <Form {...depositForm}>
      <form
        onSubmit={depositForm.handleSubmit(handleDepositSubmit)}
        className="space-y-4"
      >
        {depositInvestment && (
          <p className="text-sm text-muted-foreground">
            {depositInvestment.accountName || depositInvestment.name}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={depositForm.control}
            name="amount"
            rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Must be positive' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={depositForm.control}
            name="date"
            rules={{ required: 'Date is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={depositForm.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input placeholder="Bank / provider reference" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={depositForm.control}
          name="proofOfDepositFiles"
          rules={{
            validate: (files) =>
              !files || files.length === 0
                ? 'Proof of deposit is required'
                : true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Proof of deposit</FormLabel>
              <FormControl>
                <FileUpload
                  multiple={false}
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={depositSubmitting}>
          {depositSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording...
            </span>
          ) : (
            'Record deposit'
          )}
        </Button>
      </form>
    </Form>
  )

  const withdrawalFormContent = (
    <Form {...withdrawalForm}>
      <form
        onSubmit={withdrawalForm.handleSubmit(handleWithdrawalSubmit)}
        className="space-y-4"
      >
        {withdrawalInvestment && (
          <p className="text-sm text-muted-foreground">
            {withdrawalInvestment.accountName || withdrawalInvestment.name}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={withdrawalForm.control}
            name="amount"
            rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Must be positive' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={withdrawalForm.control}
            name="date"
            rules={{ required: 'Date is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={withdrawalForm.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input placeholder="Bank / provider reference" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={withdrawalForm.control}
          name="redemptionFormFiles"
          rules={{
            validate: (files) =>
              !files || files.length === 0
                ? 'Redemption form is required'
                : true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Redemption form</FormLabel>
              <FormControl>
                <FileUpload
                  multiple={false}
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={withdrawalSubmitting}>
          {withdrawalSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording...
            </span>
          ) : (
            'Record withdrawal'
          )}
        </Button>
      </form>
    </Form>
  )

  const propertyFormContent = (
    <Form {...propertyForm}>
      <form
        onSubmit={propertyForm.handleSubmit(handlePropertySubmit)}
        className="space-y-4"
      >
        <FormField
          control={propertyForm.control}
          name="propertyId"
          rules={{ required: 'Select a property' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Property</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={propertySubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {properties.map(prop => (
                    <SelectItem key={prop._id} value={prop._id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={propertyForm.control}
          name="transactionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={v =>
                  field.onChange(v as 'purchase' | 'sale' | 'maintenance' | 'fees')
                }
                disabled={propertySubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="fees">Fees</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={propertyForm.control}
            name="amount"
            rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Must be positive' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={propertyForm.control}
            name="date"
            rules={{ required: 'Date is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={propertyForm.control}
          name="counterparty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Counterparty</FormLabel>
              <FormControl>
                <Input placeholder="Buyer, seller or vendor" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={propertyForm.control}
          name="documentFiles"
          rules={{
            validate: (files) => {
              const type = propertyForm.getValues('transactionType')
              if (['purchase', 'sale'].includes(type) && (!files || files.length === 0)) {
                return 'Supporting documents are required for purchase and sale'
              }
              return true
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required={['purchase', 'sale'].includes(propertyForm.watch('transactionType'))}>
                Documents
              </FormLabel>
              <FormDescription className="text-xs">
                Title deeds, sale agreements - required for purchase and sale
              </FormDescription>
              <FormControl>
                <FileUpload
                  multiple
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={propertyForm.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Optional notes" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={propertySubmitting}>
          {propertySubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording...
            </span>
          ) : (
            'Record transaction'
          )}
        </Button>
      </form>
    </Form>
  )

  const statementFormContent = (
    <Form {...statementForm}>
      <form
        onSubmit={statementForm.handleSubmit(handleStatementSubmit)}
        className="space-y-4"
      >
        <FormField
          control={statementForm.control}
          name="investmentId"
          rules={{ required: 'Select an investment' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Investment</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={statementSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select investment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {grouped.unitTrusts.map(inv => (
                    <SelectItem key={inv._id} value={inv._id}>
                      {inv.accountName || inv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={statementForm.control}
          name="statementDate"
          rules={{ required: 'Date is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Statement date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={statementForm.control}
            name="closingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closing balance</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={statementForm.control}
            name="interestEarned"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest / returns</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={statementForm.control}
          name="documentFiles"
          rules={{
            validate: (files) =>
              !files || files.length === 0
                ? 'Statement document is required'
                : true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Statement document</FormLabel>
              <FormDescription className="text-xs">
                Upload the PDF or image of the statement
              </FormDescription>
              <FormControl>
                <FileUpload
                  multiple={false}
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={statementForm.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Optional notes" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={statementSubmitting}>
          {statementSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </span>
          ) : (
            'Upload statement'
          )}
        </Button>
      </form>
    </Form>
  )

  const createInvestmentContent = (
    <Form {...createForm}>
      <form
        onSubmit={createForm.handleSubmit(handleCreateInvestment)}
        className="space-y-4"
      >
        <FormField
          control={createForm.control}
          name="investmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Type</FormLabel>
              <Select
                value="unit_trust"
                onValueChange={() => {}}
                disabled
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit Trust" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unit_trust">Unit Trust</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={createForm.control}
          name="provider"
          rules={{
            validate: (v) =>
              createForm.getValues('investmentType') === 'unit_trust' && !v
                ? 'Provider is required for unit trust'
                : true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required={createForm.watch('investmentType') === 'unit_trust'}>
                Provider
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Stanbic Unit Trust" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {createForm.watch('investmentType') === 'unit_trust' && (
          <>
            <FormField
              control={createForm.control}
              name="accountName"
              rules={{ required: 'Account name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Account name</FormLabel>
                  <FormControl>
                    <Input placeholder="Account name as registered" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={createForm.control}
              name="product"
              rules={{ required: 'Product is required for unit trust' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Product</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={createSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={createForm.control}
                name="memberNumber"
                rules={{ required: 'Member number is required for unit trust' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Member number</FormLabel>
                    <FormControl>
                      <Input placeholder="Member number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="accountNumber"
                rules={{ required: 'Account number is required for unit trust' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Account number</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        <Button type="submit" className="w-full" disabled={createSubmitting}>
          {createSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </span>
          ) : (
            'Create investment'
          )}
        </Button>
      </form>
    </Form>
  )

  const createPropertyContent = (
    <Form {...createPropertyForm}>
      <form
        onSubmit={createPropertyForm.handleSubmit(handleCreateProperty)}
        className="space-y-4"
      >
        <FormField
          control={createPropertyForm.control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Plot 123 - Kyaliwajjala" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createPropertyForm.control}
          name="propertyType"
          rules={{ required: 'Type is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={createPropertySubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createPropertyForm.control}
          name="dateAcquired"
          rules={{ required: 'Date acquired is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Date acquired</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={createPropertyForm.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Address or area" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={createPropertyForm.control}
            name="plotNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plot / title reference</FormLabel>
                <FormControl>
                  <Input placeholder="Plot number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={createPropertyForm.control}
          name="landTitleFiles"
          rules={{
            validate: (files) =>
              !files || files.length === 0 ? 'Land title is required' : true,
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Land title</FormLabel>
              <FormDescription className="text-xs">
                Copy of the land title or title deed
              </FormDescription>
              <FormControl>
                <FileUpload
                  multiple={false}
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createPropertyForm.control}
          name="documentFiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other documents</FormLabel>
              <FormDescription className="text-xs">
                Sale agreement, survey, etc.
              </FormDescription>
              <FormControl>
                <FileUpload
                  multiple
                  accept="application/pdf,image/*"
                  maxSize={10}
                  onFilesChange={files => field.onChange(files || [])}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={createPropertySubmitting}>
          {createPropertySubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </span>
          ) : (
            'Create property'
          )}
        </Button>
      </form>
    </Form>
  )

  return (
    <div className="flex-col md:flex">
      <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Investments
            </h1>
            <p className="text-sm text-muted-foreground">
              Track club investments: unit trusts, bonds and property.
              Record deposits, withdrawals and upload statements.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreatePropertyOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create property
            </Button>
            <Button onClick={() => setCreateInvestmentOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create investment
            </Button>
          </div>
        </div>

        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList>
            <TabsTrigger value="financial">Unit Trust</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-4">
            {grouped.unitTrusts.length === 0 ? (
              renderEmptyTab('financial', 'unit trust')
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.unitTrusts.map(inv => renderInvestmentCard(inv, 'financial'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="property" className="space-y-4">
            {properties.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">No properties yet</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Create a property to start tracking land, apartments and other real estate.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCreatePropertyOpen(true)}>
                    Create property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map(prop => renderPropertyCard(prop))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            {grouped.other.length === 0 ? (
              renderEmptyTab('other', 'other')
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.other.map(inv => renderInvestmentCard(inv, 'other'))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Investment detail dialog */}
        <Dialog
          open={!!selectedInvestment}
          onOpenChange={open => !open && setSelectedInvestment(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedInvestment && (
              <>
                <DialogHeader>
                  <DialogTitle>
                  {selectedInvestment.investmentType === 'unit_trust'
                    ? selectedInvestment.accountName || selectedInvestment.name
                    : selectedInvestment.name}
                </DialogTitle>
                  <DialogDescription className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      {selectedInvestment.provider}
                      <Badge variant="outline">
                        {INVESTMENT_TYPE_LABELS[selectedInvestment.investmentType]}
                      </Badge>
                    </span>
                    {selectedInvestment.investmentType === 'unit_trust' && (
                      <span className="text-xs mt-1">
                        {[
                          selectedInvestment.product &&
                            (PRODUCT_LABELS[selectedInvestment.product] ??
                              selectedInvestment.product),
                          selectedInvestment.memberNumber &&
                            `Member #${selectedInvestment.memberNumber}`,
                          selectedInvestment.accountNumber &&
                            `Acct #${selectedInvestment.accountNumber}`,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {isFinancialInvestment(selectedInvestment.investmentType) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary"
                          onClick={() => openDepositForm(selectedInvestment)}
                        >
                          <ArrowDownCircle className="h-4 w-4 mr-1" />
                          Deposit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openWithdrawalForm(selectedInvestment)}>
                          <ArrowUpCircle className="h-4 w-4 mr-1" />
                          Withdrawal
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openStatementForm(selectedInvestment)}>
                          <FilePlus className="h-4 w-4 mr-1" />
                          Statement
                        </Button>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        {isFinancialInvestment(selectedInvestment.investmentType)
                          ? 'Transactions'
                          : 'Transactions'}
                      </h4>
                      <ul className="space-y-2">
                        {invTransactions?.map((t: FinancialInvestmentTransaction) => (
                          <li
                            key={t._id}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span>
                              {t.transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                            </span>
                            <span>UGX {t.amount.toLocaleString()}</span>
                            <span className="text-muted-foreground">{t.date}</span>
                            {t.proofOfDeposit?.asset && (
                              <a
                                href={t.proofOfDeposit.asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Proof
                              </a>
                            )}
                            {t.redemptionForm?.asset && (
                              <a
                                href={t.redemptionForm.asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Redemption
                              </a>
                            )}
                          </li>
                        ))}
                        {(!invTransactions || invTransactions.length === 0) && (
                          <li className="text-sm text-muted-foreground py-4 text-center">
                            No transactions yet
                          </li>
                        )}
                      </ul>
                    </div>
                    {invStatements && invStatements.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Statements</h4>
                        <ul className="space-y-2">
                          {invStatements.map(s => (
                            <li key={s._id}>
                              <a
                                href={s.document?.asset?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted"
                              >
                                <span>{format(new Date(s.statementDate), 'MMM d, yyyy')}</span>
                                {s.closingBalance != null && (
                                  <span>UGX {s.closingBalance.toLocaleString()}</span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <Button
                  variant="outline"
                  onClick={() => setSelectedInvestment(null)}
                  className="mt-4"
                >
                  Close
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Property detail dialog */}
        <Dialog
          open={!!selectedProperty}
          onOpenChange={open => !open && setSelectedProperty(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedProperty && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedProperty.name}</DialogTitle>
                  <DialogDescription className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">
                        {PROPERTY_TYPE_LABELS[selectedProperty.propertyType]}
                      </Badge>
                      {selectedProperty.location && (
                        <span>{selectedProperty.location}</span>
                      )}
                    </span>
                    <span className="text-xs mt-1">
                      {[
                        selectedProperty.plotNumber && `Plot: ${selectedProperty.plotNumber}`,
                        selectedProperty.dateAcquired &&
                          `Acquired: ${format(new Date(selectedProperty.dateAcquired), 'PPP')}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openPropertyForm(selectedProperty)}>
                        <FilePlus className="h-4 w-4 mr-1" />
                        Record transaction
                      </Button>
                      {selectedProperty.landTitle?.asset?.url && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={selectedProperty.landTitle.asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View land title
                          </a>
                        </Button>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Transactions</h4>
                      <ul className="space-y-2">
                        {propTransactions.map(t => (
                          <li
                            key={t._id}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span>
                              {t.transactionType === 'purchase'
                                ? 'Purchase'
                                : t.transactionType === 'sale'
                                  ? 'Sale'
                                  : t.transactionType === 'maintenance'
                                    ? 'Maintenance'
                                    : 'Fees'}
                            </span>
                            <span>UGX {t.amount.toLocaleString()}</span>
                            <span className="text-muted-foreground">{t.date}</span>
                          </li>
                        ))}
                        {(!propTransactions || propTransactions.length === 0) && (
                          <li className="text-sm text-muted-foreground py-4 text-center">
                            No transactions yet
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </ScrollArea>
                <Button
                  variant="outline"
                  onClick={() => setSelectedProperty(null)}
                  className="mt-4"
                >
                  Close
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Deposit form */}
        {isDesktop ? (
          <Dialog
            open={depositFormOpen}
            onOpenChange={(open) => {
              setDepositFormOpen(open)
              if (!open) setDepositInvestment(null)
            }}
          >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record deposit</DialogTitle>
                <DialogDescription>Upload proof of deposit (bank slip or confirmation).</DialogDescription>
              </DialogHeader>
              {depositFormContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer
            open={depositFormOpen}
            onOpenChange={(open) => {
              setDepositFormOpen(open)
              if (!open) setDepositInvestment(null)
            }}
          >
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Record deposit</DrawerTitle>
                <DrawerDescription>Upload proof of deposit (bank slip or confirmation).</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{depositFormContent}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Withdrawal form */}
        {isDesktop ? (
          <Dialog
            open={withdrawalFormOpen}
            onOpenChange={(open) => {
              setWithdrawalFormOpen(open)
              if (!open) setWithdrawalInvestment(null)
            }}
          >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record withdrawal</DialogTitle>
                <DialogDescription>Upload signed redemption form.</DialogDescription>
              </DialogHeader>
              {withdrawalFormContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer
            open={withdrawalFormOpen}
            onOpenChange={(open) => {
              setWithdrawalFormOpen(open)
              if (!open) setWithdrawalInvestment(null)
            }}
          >
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Record withdrawal</DrawerTitle>
                <DrawerDescription>Upload signed redemption form.</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{withdrawalFormContent}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Property transaction form */}
        {isDesktop ? (
          <Dialog open={propertyFormOpen} onOpenChange={setPropertyFormOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record property transaction</DialogTitle>
                <DialogDescription>
                  Upload title deeds or sale agreements for purchase and sale.
                </DialogDescription>
              </DialogHeader>
              {propertyFormContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={propertyFormOpen} onOpenChange={setPropertyFormOpen}>
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Record property transaction</DrawerTitle>
                <DrawerDescription>
                  Upload title deeds or sale agreements for purchase and sale.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{propertyFormContent}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Statement form */}
        {isDesktop ? (
          <Dialog open={statementFormOpen} onOpenChange={setStatementFormOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload statement</DialogTitle>
                <DialogDescription>
                  Upload the monthly or periodic statement from your provider.
                </DialogDescription>
              </DialogHeader>
              {statementFormContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={statementFormOpen} onOpenChange={setStatementFormOpen}>
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Upload statement</DrawerTitle>
                <DrawerDescription>
                  Upload the monthly or periodic statement from your provider.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{statementFormContent}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Create property form */}
        {isDesktop ? (
          <Dialog open={createPropertyOpen} onOpenChange={setCreatePropertyOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create property</DialogTitle>
                <DialogDescription>
                  Add land, apartment or other property. Land title is required.
                </DialogDescription>
              </DialogHeader>
              {createPropertyContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={createPropertyOpen} onOpenChange={setCreatePropertyOpen}>
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Create property</DrawerTitle>
                <DrawerDescription>
                  Add land, apartment or other property. Land title is required.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{createPropertyContent}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Create investment form */}
        {isDesktop ? (
          <Dialog open={createInvestmentOpen} onOpenChange={setCreateInvestmentOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create investment</DialogTitle>
                <DialogDescription>
                  Add a new investment to track. Choose the type to enable the
                  right transactions.
                </DialogDescription>
              </DialogHeader>
              {createInvestmentContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={createInvestmentOpen} onOpenChange={setCreateInvestmentOpen}>
            <DrawerContent className="max-h-[90vh] overflow-y-auto">
              <DrawerHeader>
                <DrawerTitle>Create investment</DrawerTitle>
                <DrawerDescription>
                  Add a new investment to track.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6">{createInvestmentContent}</div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    </div>
  )
}
