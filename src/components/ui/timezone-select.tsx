'use client'
import { ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { tzAbbr, tzOffset, TIMEZONE_GROUPS } from '@/lib/timezone'

interface TimezoneSelectProps {
  value: string
  onChange: (tz: string) => void
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-[90px] items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <span>{tzAbbr(value)}</span>
        <ChevronDownIcon className="size-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {TIMEZONE_GROUPS.map((group, i) => (
          <DropdownMenuGroup key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.options.map((opt) => (
              <DropdownMenuItem
                key={opt.iana}
                onClick={() => onChange(opt.iana)}
                className={opt.iana === value ? 'bg-accent' : ''}
              >
                <span className="flex-1">{opt.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums mr-1">{tzAbbr(opt.iana)}</span>
                <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{tzOffset(opt.iana)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
