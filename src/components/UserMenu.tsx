import { auth, signOut } from '@/lib/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export async function UserMenu() {
  const session = await auth()

  if (!session?.user) return null

  const name = session.user.name ?? session.user.email ?? 'User'
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-medium cursor-pointer transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #114574, #1D7CBE)' }}
        >
          {initials}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{name}</p>
          {session.user.email && (
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}
          >
            <button type="submit" className="w-full text-left cursor-pointer text-sm">
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
