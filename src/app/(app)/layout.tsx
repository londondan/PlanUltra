import { UserMenu } from "@/components/UserMenu"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/admin"
import Link from "next/link"
import { GuestBanner } from "@/components/GuestBanner"
import { PostSignInCleaner } from "@/components/PostSignInCleaner"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const adminUser = isAdmin(session?.user?.email)

  return (
    <>
      <GuestBanner />
      <PostSignInCleaner isAuthenticated={!!session?.user?.id} />
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <polygon points="8,1 15,15 1,15" fill="#1D7CBE" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-foreground">PlanUltra</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-primary hover:opacity-70 transition-opacity">
              Dashboard
            </Link>
            {adminUser && (
              <Link href="/admin" className="text-sm font-medium text-primary hover:opacity-70 transition-opacity">
                Admin
              </Link>
            )}
            <UserMenu />
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </>
  )
}
