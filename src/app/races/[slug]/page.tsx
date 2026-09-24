import { notFound, redirect } from 'next/navigation'
import { getRaceBySlug } from '@/lib/db/races'
import { getAidStations } from '@/lib/db/aid-stations'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const race = await getRaceBySlug(slug)
  if (!race) return {}

  const stations = await getAidStations(race.raceId)
  const crewStations = stations.filter((s) => s.hasCrewAccess)
  const isComplete =
    crewStations.length > 0 &&
    crewStations.every((s) => s.crewParkingUrl || s.crewParkingCoords)

  return {
    title: `${race.name} crew access & parking guide`,
    description: `Crew access points, parking details, and aid station locations for ${race.name}.`,
    robots: isComplete ? 'index,follow' : 'noindex,follow',
  }
}

export default async function RaceSlugPage({ params }: Props) {
  const { slug } = await params
  const race = await getRaceBySlug(slug)

  if (!race) notFound()

  if (race.crewShareToken) {
    redirect(`/crew/${race.crewShareToken}`)
  }

  // Race exists but hasn't been published as a crew sheet yet
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#02071E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-geist-sans), system-ui',
      }}
    >
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '0 24px' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>
          {race.name}
        </p>
        <p style={{ fontSize: 14 }}>Crew plan coming soon.</p>
      </div>
    </div>
  )
}
