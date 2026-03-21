interface CrewPageProps {
  params: Promise<{ shareToken: string }>
}

async function getRaceName(shareToken: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/crew/${shareToken}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.raceName ?? null
  } catch {
    return null
  }
}

export default async function CrewPage({ params }: CrewPageProps) {
  const { shareToken } = await params
  const raceName = await getRaceName(shareToken)

  if (!raceName) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Plan not found</h1>
          <p className="text-muted-foreground mt-2">
            This crew link may have been unpublished or is invalid.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{raceName}&apos;s Race Plan</h1>
      <p className="text-muted-foreground">Full crew view coming soon.</p>
    </main>
  )
}
