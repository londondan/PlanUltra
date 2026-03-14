import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRacesByUser } from '@/lib/db/races'
import Link from 'next/link'
import { buttonVariants } from '@/lib/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const races = await getRacesByUser(session.user.id).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Races</h1>
          <p className="text-muted-foreground">Plan and manage your ultra marathon races</p>
        </div>
        <Link href="/dashboard/new" className={buttonVariants()}>
          Add race
        </Link>
      </div>

      {races.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No races yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload a GPX file or select from our curated race library to get started.
          </p>
          <Link href="/dashboard/new" className={buttonVariants()}>
            Add your first race
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {races.map((race) => (
            <Link key={race.raceId} href={`/dashboard/${race.raceId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{race.name}</CardTitle>
                    <Badge variant="outline">{race.timezone}</Badge>
                  </div>
                  <CardDescription>
                    {new Date(race.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Start: {race.startTime}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
