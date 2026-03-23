import { computeSunConditions } from '@/lib/sun-utils'
import { computeSectionCalories } from '@/lib/calories'
import { ConditionCard } from '@/components/ConditionCard'
import type { AidStation } from '@/types/gpx'
import type { Section, SectionPlan } from '@/types/section'

const KM_TO_MI = 0.621371

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'rgba(17,69,116,0.5)',
  marginBottom: 8,
}

interface CrewStationCardProps {
  station: AidStation
  arrivalTime: Date | null
  sectionPlan: SectionPlan | null
  section: Section | null
  raceLat: number | null
  raceLon: number | null
  caloriesPerHour: number | null
  isFinish: boolean
}

export function CrewStationCard({
  station,
  arrivalTime,
  sectionPlan,
  section,
  raceLat,
  raceLon,
  caloriesPerHour,
  isFinish,
}: CrewStationCardProps) {
  const mileBadge = (station.distanceFromStart * KM_TO_MI).toFixed(1)

  // Station header row — shared between all card types
  const stationHeader = (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' as const, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono), Courier New, monospace',
            fontSize: 11,
            color: 'rgba(17,69,116,0.6)',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
          }}
        >
          Mile {mileBadge}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#02071E',
            flex: 1,
            minWidth: 0,
          }}
        >
          {station.name}
        </span>
      </div>
      {arrivalTime && (
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#1D7CBE',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
          }}
        >
          {formatTime(arrivalTime)}
        </span>
      )}
    </div>
  )

  // === FINISH CARD ===
  if (isFinish) {
    return (
      <div
        className="station-card"
        style={{
          border: '1px solid rgba(130,199,246,0.4)',
          borderRadius: 10,
          padding: '14px 16px',
          background: 'white',
        }}
      >
        {stationHeader}
        <p
          style={{
            fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
            fontSize: 12,
            color: 'rgba(17,69,116,0.5)',
            marginTop: 4,
          }}
        >
          Finish line 🏁
        </p>
      </div>
    )
  }

  // === NO CREW ACCESS CARD ===
  if (!station.hasCrewAccess) {
    return (
      <div
        className="station-card"
        style={{
          border: '1px solid rgba(130,199,246,0.4)',
          borderRadius: 10,
          padding: '14px 16px',
          background: 'white',
        }}
      >
        {stationHeader}
        <p
          style={{
            fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
            fontSize: 12,
            color: 'rgba(17,69,116,0.4)',
            fontStyle: 'italic',
            marginTop: 4,
          }}
        >
          No crew access
        </p>
      </div>
    )
  }

  // === CREW ACCESS CARD ===
  const gearItems: string[] = []
  if (sectionPlan) {
    if (sectionPlan.hasHeadlamp) gearItems.push('Headlamp')
    if (sectionPlan.hasPoles) gearItems.push('Poles')
    if (sectionPlan.hasExtraLayer) gearItems.push('Warm layer')
    if (sectionPlan.hasRainGear) gearItems.push('Rain gear')
    if (sectionPlan.shoeChange) gearItems.push('Shoe change')
  }

  const computedKcal = section ? computeSectionCalories(caloriesPerHour, section.durationMinutes) : null
  const kcal = sectionPlan?.caloriesOverride != null ? sectionPlan.caloriesOverride : computedKcal
  const drinkMixes = sectionPlan?.drinkMixes ?? null

  const showNutrition = drinkMixes !== null || kcal !== null
  const showPackingList = !!sectionPlan?.packingList?.trim()
  const showCrewNotes = !!sectionPlan?.crewNotes?.trim()

  // Sun/weather conditions
  const sunConditions =
    section && raceLat !== null && raceLon !== null
      ? computeSunConditions(section, raceLat, raceLon)
      : null
  const weatherCondition = section?.weatherCondition ?? null

  const hasConditions =
    sunConditions?.hasNight ||
    sunConditions?.sunriseAt ||
    sunConditions?.sunsetAt ||
    weatherCondition

  return (
    <div
      className="station-card station-card--crew"
      style={{
        border: '1px solid rgba(130,199,246,0.4)',
        borderRadius: 10,
        padding: '14px 16px',
        background: '#DBF1FA',
      }}
    >
      {stationHeader}

      {/* Crew access badge */}
      <p
        style={{
          fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
          fontSize: 12,
          color: '#1D7CBE',
          fontWeight: 600,
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        ✓ Crew access
      </p>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(130,199,246,0.4)', marginBottom: 12 }} />

      {/* Segment label */}
      {sectionPlan && (
        <p style={LABEL_STYLE}>
          Next segment: {sectionPlan.fromStationName} → {sectionPlan.toStationName}
        </p>
      )}

      {/* Gear from drop bag */}
      {gearItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={LABEL_STYLE}>Grab from drop bag</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {gearItems.map((item) => (
              <li
                key={item}
                style={{
                  fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                  fontSize: 14,
                  color: '#02071E',
                  marginBottom: 2,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nutrition for this leg */}
      {showNutrition && (
        <div style={{ marginBottom: 12 }}>
          <p style={LABEL_STYLE}>Nutrition for this leg</p>
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 14,
              color: '#02071E',
            }}
          >
            {drinkMixes !== null && `${drinkMixes}× drink mix`}
            {drinkMixes !== null && kcal !== null && ' · '}
            {kcal !== null && `~${kcal.toLocaleString()} kcal`}
          </p>
        </div>
      )}

      {/* Packing list (free text) */}
      {showPackingList && (
        <div style={{ marginBottom: 12 }}>
          <p style={LABEL_STYLE}>Food / supplies</p>
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 14,
              color: '#02071E',
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {sectionPlan!.packingList}
          </p>
        </div>
      )}

      {/* Crew notes */}
      {showCrewNotes && (
        <div style={{ marginBottom: 12 }}>
          <p style={LABEL_STYLE}>Crew notes</p>
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 14,
              color: '#02071E',
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {sectionPlan!.crewNotes}
          </p>
        </div>
      )}

      {/* Conditions */}
      {hasConditions && (
        <div>
          <p style={LABEL_STYLE}>Conditions — next segment</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 8,
            }}
          >
            {weatherCondition && (
              <ConditionCard
                type={`weather-${weatherCondition.type}` as Parameters<typeof ConditionCard>[0]['type']}
                label={`${weatherCondition.emoji} Weather`}
                value={`${weatherCondition.minTemp}°→${weatherCondition.maxTemp}°F`}
                subLabel={weatherCondition.subLabel}
              />
            )}

            {sunConditions?.hasNight && (() => {
              let nightValue: string
              let nightSubLabel: string
              if (sunConditions.sunriseAt) {
                nightValue = `Start → ~mi ${sunConditions.sunriseAt.sectionMile.toFixed(1)}`
                nightSubLabel = `Sunrise ${formatTime(sunConditions.sunriseAt.time)}`
              } else if (sunConditions.sunsetAt) {
                nightValue = `~mi ${sunConditions.sunsetAt.sectionMile.toFixed(1)} → end`
                nightSubLabel = `Sunset ${formatTime(sunConditions.sunsetAt.time)}`
              } else {
                nightValue = 'Full segment'
                nightSubLabel = 'Entire leg in darkness'
              }
              return (
                <ConditionCard
                  type="night"
                  label="🌙 Night running"
                  value={nightValue}
                  subLabel={nightSubLabel}
                />
              )
            })()}

            {sunConditions?.sunriseAt && (
              <ConditionCard
                type="sunrise"
                label="🌅 Sunrise"
                value={`~mi ${sunConditions.sunriseAt.sectionMile.toFixed(1)} · ${formatTime(sunConditions.sunriseAt.time)}`}
                subLabel={sunConditions.hasNight ? 'Starts dark, light at sunrise' : 'Sunrise near end'}
              />
            )}

            {sunConditions?.sunsetAt && (
              <ConditionCard
                type="sunset"
                label="🌇 Sunset"
                value={`~mi ${sunConditions.sunsetAt.sectionMile.toFixed(1)} · ${formatTime(sunConditions.sunsetAt.time)}`}
                subLabel={`Headlamp from ~mi ${sunConditions.sunsetAt.sectionMile.toFixed(0)}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
