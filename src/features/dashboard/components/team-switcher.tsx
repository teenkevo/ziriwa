'use client'

import * as React from 'react'
import { Boxes, Check, ChevronsUpDown, PlusCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const groups = [
  {
    label: 'Investment Groups',
    teams: [
      {
        label: 'Phoenix',
        value: 'phoenix',
      },
      // {
      //   label: 'Kwagalana',
      //   value: 'kwagalana',
      // },
    ],
  },
]

type Team = (typeof groups)[number]['teams'][number]

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface TeamSwitcherProps extends PopoverTriggerProps {}

export default function TeamSwitcher({ className }: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false)
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(
    groups[0].teams[0],
  )

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Select a team'
            className={cn('w-[200px] justify-between', className)}
          >
            <Boxes className='text-muted-foreground' />
            {selectedTeam.label}
            <ChevronsUpDown className='ml-auto opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[200px] p-0'>
          <Command>
            <CommandInput placeholder='Search group...' />
            <CommandList>
              <CommandEmpty>No group found.</CommandEmpty>
              {groups.map(group => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.teams.map(team => (
                    <CommandItem
                      key={team.value}
                      onSelect={() => {
                        setSelectedTeam(team)
                        setOpen(false)
                      }}
                      className='text-sm'
                    >
                      <Avatar className='mr-2 h-5 w-5'>
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${team.value}.png`}
                          alt={team.label}
                          className='grayscale'
                        />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      {team.label}
                      <Check
                        className={cn(
                          'ml-auto',
                          selectedTeam.value === team.value
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      setShowNewTeamDialog(true)
                    }}
                  >
                    <PlusCircle className='h-5 w-5' />
                    Create Group
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create Investment Group{' '}
            <Badge variant='destructive' className='ml-2'>
              Coming soon
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Add a new group to manage members and their investments.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='name' required>Group Name</Label>
              <Input id='name' placeholder='Acme Inc.' />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='plan'>Status</Label>
              <Select defaultValue='active'>
                <SelectTrigger>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    <span className='font-medium'>Active</span> -{' '}
                    <span className='text-muted-foreground'>
                      Can add members and investments
                    </span>
                  </SelectItem>
                  <SelectItem value='inactive'>
                    <span className='font-medium'>Inactive</span> -{' '}
                    <span className='text-muted-foreground'>
                      Can't add members or investments
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setShowNewTeamDialog(false)}>
            Cancel
          </Button>
          <Button type='submit'>
            <PlusCircle /> Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
