'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/file-upload'
import {
  FileText,
  FilePlus,
  Loader2,
  UserPlus,
  Check,
  CircleAlert,
  CalendarCheck,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type {
  Meeting,
  MeetingType,
  MeetingFile,
} from '@/sanity/lib/meetings/get-all-meeting-minutes'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import Image from 'next/image'
import type { MemberForAttendance } from '@/sanity/lib/members/get-members-for-attendance'
import type { AttendanceStatus } from '@/sanity/lib/meetings/upsert-attendance'
import type { MeetingAttendanceRecord } from '@/sanity/lib/meetings/get-attendance-by-meeting'
import AttendanceSheetDownloadButton from '@/features/pdfs/attendance-sheet-download-button'
import { DeleteMeeting } from '@/features/meetings/delete-meeting'

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  agm: 'AGM',
  executive: 'Executive',
  ordinary: 'Ordinary',
  other: 'Others',
}

interface MeetingsPageProps {
  meetings: Meeting[]
  members: MemberForAttendance[]
}

type MeetingFormValues = {
  title: string
  meetingType: MeetingType
  meetingDate: string
  agendaFiles: File[]
  financialFiles: File[]
}

export function MeetingsPage({ meetings, members }: MeetingsPageProps) {
  const router = useRouter()
  const isDesktop =
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [attendanceMeeting, setAttendanceMeeting] = useState<Meeting | null>(
    null,
  )
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<
    Record<string, AttendanceStatus>
  >({})
  const [attendanceReasonMap, setAttendanceReasonMap] = useState<
    Record<string, string>
  >({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [showConfirmAttendance, setShowConfirmAttendance] = useState(false)
  const [minutesMeeting, setMinutesMeeting] = useState<Meeting | null>(null)
  const [minutesFiles, setMinutesFiles] = useState<File[]>([])
  const [isMinutesUploading, setIsMinutesUploading] = useState(false)
  const form = useForm<MeetingFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      meetingType: 'agm',
      meetingDate: '',
    },
  })

  useEffect(() => {
    if (isUploadDialogOpen) {
      form.reset({
        title: '',
        meetingType: 'agm',
        meetingDate: '',
        agendaFiles: [],
        financialFiles: [],
      })
      setUploadError(null)
    }
  }, [isUploadDialogOpen, form])

  useEffect(() => {
    if (!attendanceMeeting) {
      setAttendanceStatusMap({})
      setAttendanceReasonMap({})
      return
    }
    setAttendanceLoading(true)
    fetch(`/api/meetings/${attendanceMeeting._id}/attendance`)
      .then(res => res.json())
      .then((data: MeetingAttendanceRecord[]) => {
        const statusMap: Record<string, AttendanceStatus> = {}
        const reasonMap: Record<string, string> = {}
        for (const m of members) {
          statusMap[m._id] = 'absent'
        }
        for (const a of Array.isArray(data) ? data : []) {
          if (a.member?._id) {
            statusMap[a.member._id] = a.status
            if (a.status === 'excused' && a.excusedReason) {
              reasonMap[a.member._id] = a.excusedReason
            }
          }
        }
        setAttendanceStatusMap(statusMap)
        setAttendanceReasonMap(reasonMap)
      })
      .catch(() => setAttendanceStatusMap({}))
      .finally(() => setAttendanceLoading(false))
  }, [attendanceMeeting, members])

  const grouped = useMemo(() => {
    const initial: Record<MeetingType, Meeting[]> = {
      agm: [],
      executive: [],
      ordinary: [],
      other: [],
    }
    return meetings.reduce((acc, meeting) => {
      const type = meeting.meetingType ?? 'other'
      if (!acc[type]) {
        acc[type as MeetingType] = []
      }
      acc[type as MeetingType].push(meeting)
      return acc
    }, initial)
  }, [meetings])

  const defaultTab: MeetingType =
    (['agm', 'executive', 'ordinary', 'other'] as MeetingType[]).find(
      type => grouped[type] && grouped[type].length > 0,
    ) ?? 'agm'

  const handleUpload = async (values: MeetingFormValues) => {
    const agendaFile = values.agendaFiles?.[0]
    const financialsFile = values.financialFiles?.[0]

    if (
      !values.title ||
      !values.meetingDate ||
      !agendaFile ||
      !financialsFile
    ) {
      setUploadError('Title, date, agenda and financials are required.')
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('meetingType', values.meetingType)
      formData.append('meetingDate', values.meetingDate)
      formData.append('agenda', agendaFile)
      formData.append('financials', financialsFile)

      const res = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setUploadError(data?.error || 'Failed to upload minutes.')
      } else {
        form.reset()
        setIsUploadDialogOpen(false)
        toast.success('Meeting created successfully')
        router.refresh()
      }
    } catch (error) {
      setUploadError('Something went wrong while uploading.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {}
    for (const m of members) {
      next[m._id] = 'present'
    }
    setAttendanceStatusMap(next)
    setAttendanceReasonMap({})
  }

  const handleClearAll = () => {
    const next: Record<string, AttendanceStatus> = {}
    for (const m of members) {
      next[m._id] = 'absent'
    }
    setAttendanceStatusMap(next)
    setAttendanceReasonMap({})
  }

  const handleAddMinutes = async () => {
    if (!minutesMeeting) return
    const file = minutesFiles?.[0]
    if (!file) {
      toast.error('Please select a minutes file to upload')
      return
    }
    setIsMinutesUploading(true)
    try {
      const formData = new FormData()
      formData.append('minutes', file)
      const res = await fetch(`/api/meetings/${minutesMeeting._id}/minutes`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to upload minutes')
      }
      toast.success('Minutes uploaded successfully')
      setMinutesMeeting(null)
      setMinutesFiles([])
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload minutes')
    } finally {
      setIsMinutesUploading(false)
    }
  }

  const handleSaveAttendance = async () => {
    if (!attendanceMeeting) return
    const hasMissingReasons = members.some(m => {
      const s = attendanceStatusMap[m._id] ?? 'absent'
      const reason = (attendanceReasonMap[m._id] ?? '').trim()
      return s === 'excused' && !reason
    })
    if (hasMissingReasons) {
      toast.error(
        'Reason for excusal is required for all excused members before saving.',
      )
      setShowConfirmAttendance(false)
      return
    }
    setShowConfirmAttendance(false)
    setAttendanceSaving(true)
    try {
      const body = members.map(m => {
        const s = attendanceStatusMap[m._id] ?? 'absent'
        const reason = (attendanceReasonMap[m._id] ?? '').trim()
        const item: {
          memberId: string
          status: AttendanceStatus
          excusedReason?: string
        } = {
          memberId: m._id,
          status: s,
        }
        if (s === 'excused') item.excusedReason = reason
        return item
      })
      const res = await fetch(
        `/api/meetings/${attendanceMeeting._id}/attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save')
      }
      toast.success('Attendance recorded')
      setAttendanceMeeting(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save attendance')
    } finally {
      setAttendanceSaving(false)
    }
  }

  const uploadForm = (
    <Form
      key={isUploadDialogOpen ? 'meeting-form-open' : 'meeting-form-closed'}
      {...form}
    >
      <form
        onSubmit={form.handleSubmit(handleUpload)}
        className='max-h-[500px] overflow-y-auto space-y-4 mt-2'
      >
        <fieldset disabled={isUploading} className='space-y-6 px-1'>
          <FormField
            control={form.control}
            name='title'
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel required>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder='e.g. AGM 2025 Meeting'
                    disabled={isUploading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FormField
              control={form.control}
              name='meetingType'
              rules={{ required: 'Meeting type is required' }}
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel required>Meeting type</FormLabel>
                  <Select
                    disabled={isUploading}
                    value={field.value}
                    onValueChange={val => field.onChange(val as MeetingType)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='agm'>AGM</SelectItem>
                      <SelectItem value='executive'>Executive</SelectItem>
                      <SelectItem value='ordinary'>Ordinary</SelectItem>
                      <SelectItem value='other'>Others</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='meetingDate'
              rules={{ required: 'Meeting date is required' }}
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel required>Meeting date</FormLabel>
                  <FormControl>
                    <Input
                      type='datetime-local'
                      disabled={isUploading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='agendaFiles'
            rules={{ required: 'Agenda file is required' }}
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel required>Agenda</FormLabel>
                <FormDescription className='text-xs'>
                  Upload the meeting agenda document.
                </FormDescription>
                <FormControl>
                  <FileUpload
                    multiple={false}
                    accept='application/pdf,image/*'
                    maxSize={10}
                    onFilesChange={files => field.onChange(files)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='financialFiles'
            rules={{ required: 'Financials file is required' }}
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel required>Financials</FormLabel>
                <FormDescription className='text-xs'>
                  Upload the financial report for this meeting.
                </FormDescription>
                <FormControl>
                  <FileUpload
                    multiple={false}
                    accept='application/pdf,image/*'
                    maxSize={10}
                    onFilesChange={files => field.onChange(files)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {uploadError && (
            <p className='text-xs text-destructive'>{uploadError}</p>
          )}
        </fieldset>

        <div className='px-1 pt-2'>
          <Button type='submit' className='w-full' disabled={isUploading}>
            {isUploading ? (
              <span className='inline-flex items-center justify-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Creating meeting...
              </span>
            ) : (
              'Create meeting'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )

  return (
    <div className='flex-col md:flex'>
      <div className='h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='md:text-3xl text-2xl font-bold tracking-tight'>
              Meetings
            </h1>
            <p className='text-sm text-muted-foreground'>
              Browse meetings organized by type, or create new meetings with
              agenda, financials and minutes attached.
            </p>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            Create meeting
          </Button>
        </div>

        <Tabs defaultValue={defaultTab} className='space-y-4'>
          <TabsList>
            <TabsTrigger value='agm'>AGM</TabsTrigger>
            <TabsTrigger value='executive'>Executive</TabsTrigger>
            <TabsTrigger value='ordinary'>Ordinary</TabsTrigger>
            <TabsTrigger value='other'>Others</TabsTrigger>
          </TabsList>

          {(Object.keys(grouped) as MeetingType[]).map(type => (
            <TabsContent key={type} value={type} className='space-y-4'>
              {grouped[type].length === 0 ? (
                <Card className='border-dashed'>
                  <CardContent className='flex flex-col items-center justify-center py-12 text-center space-y-3'>
                    <div className='p-3 rounded-full bg-muted'>
                      <FileText className='h-6 w-6 text-muted-foreground' />
                    </div>
                    <div className='space-y-1'>
                      <h3 className='text-sm font-semibold'>
                        No {MEETING_TYPE_LABELS[type]} meetings yet
                      </h3>
                      <p className='text-xs text-muted-foreground max-w-md'>
                        When meetings are created for this meeting type, they
                        will appear here.
                      </p>
                    </div>
                    <Button
                      size='sm'
                      onClick={() => setIsUploadDialogOpen(true)}
                    >
                      Create meeting
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {grouped[type].map(minute => (
                    <Card
                      key={minute._id}
                      className='hover:shadow-md transition-shadow cursor-pointer'
                      onClick={() => setSelectedMeeting(minute)}
                    >
                      <CardHeader>
                        <div className='flex items-start justify-between gap-2'>
                          <div>
                            <CardTitle className='text-base font-semibold'>
                              {minute.title}
                            </CardTitle>
                            <CardDescription className='mt-1'>
                              {minute.meetingDate
                                ? format(
                                    new Date(minute.meetingDate),
                                    'MMM d, yyyy, h:mm a',
                                  )
                                : 'Date not set'}
                            </CardDescription>
                          </div>
                          <Badge variant='outline'>
                            {MEETING_TYPE_LABELS[type]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className='space-y-3'>
                        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
                          <span className='inline-flex items-center gap-1'>
                            {minute.attendanceLockedAt ||
                            (Array.isArray(minute.attendance) &&
                              minute.attendance.length > 0) ? (
                              <Check className='h-3 w-3 shrink-0 text-green-600' />
                            ) : (
                              <CircleAlert className='h-3 w-3 shrink-0 text-amber-500' />
                            )}
                            Attendance
                          </span>
                          <span className='inline-flex items-center gap-1'>
                            {minute.agenda?.asset ? (
                              <Check className='h-3 w-3 shrink-0 text-green-600' />
                            ) : (
                              <CircleAlert className='h-3 w-3 shrink-0 text-amber-500' />
                            )}
                            Agenda
                          </span>
                          <span className='inline-flex items-center gap-1'>
                            {minute.financials?.asset ? (
                              <Check className='h-3 w-3 shrink-0 text-green-600' />
                            ) : (
                              <CircleAlert className='h-3 w-3 shrink-0 text-amber-500' />
                            )}
                            Financials
                          </span>
                          <span className='inline-flex items-center gap-1'>
                            {minute.minutes?.asset ? (
                              <Check className='h-3 w-3 shrink-0 text-green-600' />
                            ) : (
                              <CircleAlert className='h-3 w-3 shrink-0 text-amber-500' />
                            )}
                            Minutes
                          </span>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          {!minute.attendanceLockedAt && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='w-fit border-primary'
                              onClick={e => {
                                e.stopPropagation()
                                setAttendanceMeeting(minute)
                              }}
                            >
                              <UserPlus className='h-4 w-4 mr-1' />
                              Record attendance
                            </Button>
                          )}
                          {!minute.minutes?.asset && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='w-fit border-primary'
                              onClick={e => {
                                e.stopPropagation()
                                setMinutesMeeting(minute)
                              }}
                            >
                              <FilePlus className='h-4 w-4 mr-1' />
                              Add minutes
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <Dialog
          open={!!selectedMeeting}
          onOpenChange={open => !open && setSelectedMeeting(null)}
        >
          <DialogContent className='max-w-3xl'>
            {selectedMeeting && (
              <>
                <DialogHeader>
                  <DialogTitle className='flex flex-col gap-1'>
                    <span>{selectedMeeting.title}</span>
                    <span className='text-sm font-normal text-muted-foreground flex items-center gap-2'>
                      {selectedMeeting.meetingDate &&
                        format(new Date(selectedMeeting.meetingDate), 'PPPp')}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className='mt-4 max-h-[60vh] pr-4'>
                  <ul className='space-y-2 text-sm'>
                    <li>
                      <p className='text-sm font-light mb-1'>Attendance</p>
                      {selectedMeeting.attendanceLockedAt ||
                      (Array.isArray(selectedMeeting.attendance) &&
                        selectedMeeting.attendance.length > 0) ? (
                        selectedMeeting.meetingType === 'agm' ? (
                          <AttendanceSheetDownloadButton
                            meeting={selectedMeeting}
                            members={members}
                          />
                        ) : (
                          <div className='flex items-center gap-2 rounded-md border px-3 py-2'>
                            <Check className='h-4 w-4 text-green-600' />
                            <span className='truncate'>
                              Attendance recorded
                            </span>
                          </div>
                        )
                      ) : (
                        <div className='flex items-center gap-2 rounded-md border px-3 py-2'>
                          <FileText className='h-4 w-4 text-muted-foreground' />
                          <span className='truncate text-muted-foreground'>
                            Attendance not yet recorded
                          </span>
                        </div>
                      )}
                    </li>
                    {(['agenda', 'financials', 'minutes'] as const).map(
                      kind => {
                        const file: MeetingFile | undefined =
                          kind === 'agenda'
                            ? selectedMeeting.agenda
                            : kind === 'financials'
                              ? selectedMeeting.financials
                              : selectedMeeting.minutes
                        const asset = file?.asset
                        const labelMap: Record<typeof kind, string> = {
                          agenda: 'Agenda',
                          financials: 'Financials',
                          minutes: 'Minutes',
                        }

                        if (!asset) {
                          return (
                            <div key={kind} className='flex flex-col gap-2'>
                              <p className='text-sm font-light'>
                                {labelMap[kind]}
                              </p>
                              <li
                                key={kind}
                                className='flex items-center justify-between gap-2 rounded-md border px-3 py-2'
                              >
                                <span className='flex items-center gap-2'>
                                  <FileText className='h-4 w-4 text-muted-foreground' />
                                  <span className='truncate text-muted-foreground'>
                                    {labelMap[kind]} file not uploaded
                                  </span>
                                </span>
                                {kind === 'minutes' && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='shrink-0'
                                    onClick={() =>
                                      setMinutesMeeting(selectedMeeting)
                                    }
                                  >
                                    <FilePlus className='h-4 w-4 mr-1' />
                                    Add minutes
                                  </Button>
                                )}
                              </li>
                            </div>
                          )
                        }

                        const ext = asset.extension
                          ? asset.extension.toUpperCase()
                          : ''

                        return (
                          <div key={kind} className='flex flex-col gap-2'>
                            <p className='text-sm font-light'>
                              {labelMap[kind]}
                            </p>
                            <li key={kind}>
                              <a
                                href={asset.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-muted transition-colors'
                              >
                                <span className='flex items-center gap-2'>
                                  <Image
                                    src='/pdf.png'
                                    alt={asset.originalFilename || 'PDF file'}
                                    width={16}
                                    height={16}
                                    className='h-6 w-6'
                                  />
                                  <span className='truncate'>
                                    {asset.originalFilename ||
                                      `${labelMap[kind]} file`}
                                  </span>
                                </span>
                                {ext && (
                                  <span className='text-[10px] uppercase text-muted-foreground'>
                                    {ext}
                                  </span>
                                )}
                              </a>
                            </li>
                          </div>
                        )
                      },
                    )}
                  </ul>
                </ScrollArea>
                <div className='mt-4 flex justify-between'>
                  <DeleteMeeting
                    meeting={selectedMeeting}
                    onDeleted={() => setSelectedMeeting(null)}
                  />
                  <Button
                    variant='outline'
                    onClick={() => setSelectedMeeting(null)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Desktop create-meeting dialog */}
        {isDesktop && (
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Create meeting</DialogTitle>
                <DialogDescription>
                  Create a new meeting and attach the agenda, financials and
                  minutes documents.
                </DialogDescription>
              </DialogHeader>
              {uploadForm}
            </DialogContent>
          </Dialog>
        )}

        {/* Mobile create-meeting drawer */}
        {!isDesktop && (
          <Drawer
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DrawerContent className='max-h-[90vh] overflow-y-auto'>
              <DrawerHeader>
                <DrawerTitle>Create meeting</DrawerTitle>
                <DrawerDescription>
                  Create a new meeting and attach the agenda, financials and
                  minutes documents.
                </DrawerDescription>
              </DrawerHeader>
              <div className='px-4 pb-6'>{uploadForm}</div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Attendance recording dialog (desktop) */}
        {isDesktop && attendanceMeeting && (
          <Dialog
            open={!!attendanceMeeting}
            onOpenChange={open => !open && setAttendanceMeeting(null)}
          >
            <DialogContent className='max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
              <DialogHeader>
                <DialogTitle>
                  Record attendance — {attendanceMeeting.title}
                </DialogTitle>
                <DialogDescription>
                  Set each member&apos;s attendance status. This data is used
                  for fines and attendance reports.
                </DialogDescription>
              </DialogHeader>
              {attendanceLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : (
                <>
                  <div className='flex gap-2 mb-4 shrink-0'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleMarkAllPresent}
                    >
                      Mark all present
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleClearAll}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className='overflow-y-auto max-h-[50vh] min-h-[200px] rounded-md border pr-2'>
                    <div className='space-y-2'>
                      {members.map(m => {
                        const status = attendanceStatusMap[m._id] ?? 'absent'
                        const needsReason = status === 'excused'
                        return (
                          <div
                            key={m._id}
                            className='flex flex-col gap-2 border-b px-3 py-2'
                          >
                            <div className='flex items-center justify-between gap-4'>
                              <div className='flex items-center gap-3 min-w-0'>
                                {status === 'present' && (
                                  <Check className='h-4 w-4 shrink-0 text-green-600' />
                                )}
                                {status === 'absent' && (
                                  <CircleAlert className='h-4 w-4 shrink-0 text-amber-500' />
                                )}
                                {status === 'excused' && (
                                  <CalendarCheck className='h-4 w-4 shrink-0 text-blue-500' />
                                )}
                                <div className='min-w-0'>
                                  <p className='text-sm font-medium truncate'>
                                    {m.fullName}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    {m.memberId}
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={status}
                                onValueChange={val =>
                                  setAttendanceStatusMap(prev => ({
                                    ...prev,
                                    [m._id]: val as AttendanceStatus,
                                  }))
                                }
                              >
                                <SelectTrigger className='w-[120px]'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='present'>
                                    Present
                                  </SelectItem>
                                  <SelectItem value='absent'>Absent</SelectItem>
                                  <SelectItem value='excused'>
                                    Excused
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {needsReason && (
                              <Input
                                placeholder='Reason for excusal (required)'
                                value={attendanceReasonMap[m._id] ?? ''}
                                onChange={e =>
                                  setAttendanceReasonMap(prev => ({
                                    ...prev,
                                    [m._id]: e.target.value,
                                  }))
                                }
                                className='text-sm'
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className='mt-4 flex justify-end'>
                    <Button
                      onClick={() => setShowConfirmAttendance(true)}
                      disabled={attendanceSaving}
                    >
                      {attendanceSaving ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                      ) : null}
                      Save attendance
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Attendance recording drawer (mobile) */}
        {!isDesktop && attendanceMeeting && (
          <Drawer
            open={!!attendanceMeeting}
            onOpenChange={open => !open && setAttendanceMeeting(null)}
          >
            <DrawerContent className='h-[85vh] max-h-[90vh] overflow-hidden flex flex-col'>
              <DrawerHeader>
                <DrawerTitle>
                  Record attendance — {attendanceMeeting.title}
                </DrawerTitle>
                <DrawerDescription>
                  Set each member&apos;s attendance status. This data is used
                  for fines and attendance reports.
                </DrawerDescription>
              </DrawerHeader>
              {attendanceLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : (
                <div className='flex flex-1 min-h-0 flex-col gap-4 px-4 pb-6'>
                  <div className='flex shrink-0 gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleMarkAllPresent}
                    >
                      Mark all present
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleClearAll}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className='min-h-0 flex-1 overflow-y-auto'>
                    <div className='space-y-2 pr-2'>
                      {members.map(m => {
                        const status = attendanceStatusMap[m._id] ?? 'absent'
                        const needsReason = status === 'excused'
                        return (
                          <div
                            key={m._id}
                            className='flex flex-col gap-2 rounded-md border px-3 py-2'
                          >
                            <div className='flex items-center justify-between gap-4'>
                              <div className='flex items-center gap-3 min-w-0'>
                                {status === 'present' && (
                                  <Check className='h-4 w-4 shrink-0 text-green-600' />
                                )}
                                {status === 'absent' && (
                                  <CircleAlert className='h-4 w-4 shrink-0 text-amber-500' />
                                )}
                                {status === 'excused' && (
                                  <CalendarCheck className='h-4 w-4 shrink-0 text-blue-500' />
                                )}
                                <div className='min-w-0'>
                                  <p className='text-sm font-medium truncate'>
                                    {m.fullName}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    {m.memberId}
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={status}
                                onValueChange={val =>
                                  setAttendanceStatusMap(prev => ({
                                    ...prev,
                                    [m._id]: val as AttendanceStatus,
                                  }))
                                }
                              >
                                <SelectTrigger className='w-[120px]'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='present'>
                                    Present
                                  </SelectItem>
                                  <SelectItem value='absent'>Absent</SelectItem>
                                  <SelectItem value='excused'>
                                    Excused
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {needsReason && (
                              <Input
                                placeholder='Reason for excusal (required)'
                                value={attendanceReasonMap[m._id] ?? ''}
                                onChange={e =>
                                  setAttendanceReasonMap(prev => ({
                                    ...prev,
                                    [m._id]: e.target.value,
                                  }))
                                }
                                className='text-sm'
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <Button
                    className='w-full shrink-0'
                    onClick={() => setShowConfirmAttendance(true)}
                    disabled={attendanceSaving}
                  >
                    {attendanceSaving ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : null}
                    Save attendance
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        )}

        {/* Add minutes dialog (desktop) */}
        {isDesktop && minutesMeeting && (
          <Dialog
            open={!!minutesMeeting}
            onOpenChange={open => {
              if (!open) {
                setMinutesMeeting(null)
                setMinutesFiles([])
              }
            }}
          >
            <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Add minutes — {minutesMeeting.title}</DialogTitle>
                <DialogDescription>
                  Upload the meeting minutes document.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label>Minutes file</Label>
                  <FileUpload
                    multiple={false}
                    accept='application/pdf,image/*'
                    maxSize={10}
                    onFilesChange={files => setMinutesFiles(files || [])}
                  />
                </div>
                <Button
                  className='w-full'
                  disabled={!minutesFiles?.[0] || isMinutesUploading}
                  onClick={handleAddMinutes}
                >
                  {isMinutesUploading ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  ) : null}
                  Upload minutes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add minutes drawer (mobile) */}
        {!isDesktop && minutesMeeting && (
          <Drawer
            open={!!minutesMeeting}
            onOpenChange={open => {
              if (!open) {
                setMinutesMeeting(null)
                setMinutesFiles([])
              }
            }}
          >
            <DrawerContent className='max-h-[90vh] overflow-y-auto'>
              <DrawerHeader>
                <DrawerTitle>Add minutes — {minutesMeeting.title}</DrawerTitle>
                <DrawerDescription>
                  Upload the meeting minutes document.
                </DrawerDescription>
              </DrawerHeader>
              <div className='space-y-4 px-4 pb-6'>
                <div className='space-y-2'>
                  <Label>Minutes file</Label>
                  <FileUpload
                    multiple={false}
                    accept='application/pdf,image/*'
                    maxSize={10}
                    onFilesChange={files => setMinutesFiles(files || [])}
                  />
                </div>
                <Button
                  className='w-full'
                  disabled={!minutesFiles?.[0] || isMinutesUploading}
                  onClick={handleAddMinutes}
                >
                  {isMinutesUploading ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  ) : null}
                  Upload minutes
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        )}

        <AlertDialog
          open={showConfirmAttendance}
          onOpenChange={setShowConfirmAttendance}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm attendance</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to confirm attendance? This action cannot
                be undone — attendance records will be locked and cannot be
                modified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault()
                  handleSaveAttendance()
                }}
              >
                Confirm attendance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
