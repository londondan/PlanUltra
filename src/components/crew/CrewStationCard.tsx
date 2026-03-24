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

  // Mist-background mile badge pill
  const mileBadgePill = (
    <span
      style={{
        fontFamily: 'var(--font-geist-mono), Courier New, monospace',
        fontSize: 10,
        color: '#02071E',
        background: 'rgba(219,241,250,0.7)',
        border: '1px solid rgba(130,199,246,0.4)',
        borderRadius: 5,
        padding: '3px 8px',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >
      MILE {mileBadge}
    </span>
  )

  // Sky-coloured mile badge pill (finish card)
  const mileBadgePillSky = (
    <span
      style={{
        fontFamily: 'var(--font-geist-mono), Courier New, monospace',
        fontSize: 10,
        color: '#82C7F6',
        background: 'rgba(130,199,246,0.15)',
        border: '1px solid rgba(130,199,246,0.3)',
        borderRadius: 5,
        padding: '3px 8px',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >
      MILE {mileBadge}
    </span>
  )

  // Standard station header row (no-access + finish cards)
  const stationHeader = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap' as const,
          flex: 1,
          minWidth: 0,
        }}
      >
        {mileBadgePill}
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontSize: 15,
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
          border: '2px solid rgba(130,199,246,0.5)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'white',
        }}
      >
        {/* Gradient header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #02071E 0%, #114574 100%)',
            padding: '14px 18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap' as const,
                flex: 1,
                minWidth: 0,
              }}
            >
              {mileBadgePillSky}
              <span
                style={{
                  fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'white',
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
                  color: '#82C7F6',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                {formatTime(arrivalTime)}
              </span>
            )}
          </div>
        </div>
        {/* Finish label */}
        <div
          style={{
            padding: '0 18px 12px',
            background: 'linear-gradient(135deg, #02071E 0%, #114574 100%)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Finish line 🏁
          </p>
        </div>
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
          padding: '14px 18px',
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
          No crew access at this station
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

  // Crew station header (mist background, with green badge)
  const crewStationHeader = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap' as const,
          flex: 1,
          minWidth: 0,
        }}
      >
        {mileBadgePill}
        <span
          style={{
            fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            color: '#02071E',
            flex: 1,
            minWidth: 0,
          }}
        >
          {station.name}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: '#15803d',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 5,
            padding: '2px 8px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          ✓ Crew access
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

  return (
    <div
      className="station-card station-card--crew"
      style={{
        border: '1px solid rgba(29,124,190,0.35)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'white',
      }}
    >
      {/* Mist header */}
      <div
        style={{
          background: '#DBF1FA',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(130,199,246,0.4)',
        }}
      >
        {crewStationHeader}
      </div>

      {/* White body */}
      <div
        style={{
          background: 'white',
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Segment label */}
        {sectionPlan && (
          <div>
            <p style={LABEL_STYLE}>Next segment</p>
            <p
              style={{
                fontFamily: 'var(--font-dm-sans), Inter, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                color: '#114574',
                marginTop: 2,
              }}
            >
              {sectionPlan.fromStationName} → {sectionPlan.toStationName}
              {section && ` (${section.distanceMiles.toFixed(1)} mi)`}
            </p>
          </div>
        )}

        {/* Divider after segment block */}
        {sectionPlan && (gearItems.length > 0 || showNutrition || showPackingList || showCrewNotes || hasConditions) && (
          <div style={{ height: 1, background: 'rgba(130,199,246,0.3)', margin: '-8px 0' }} />
        )}

        {/* Gear from drop bag */}
        {gearItems.length > 0 && (
          <div>
            <p style={LABEL_STYLE}>Grab from drop bag</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {gearItems.map((item) => (
                <span
                  key={item}
                  style={{
                    background: '#DBF1FA',
                    border: '1px solid rgba(130,199,246,0.5)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#114574',
                    fontWeight: 500,
                    fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition for this leg */}
        {showNutrition && (
          <div>
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
          <div>
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

        {/* Crew notes — yellow highlight */}
        {showCrewNotes && (
          <div>
            <p style={{ ...LABEL_STYLE, color: '#d97706' }}>Crew notes</p>
            <div
              style={{
                fontSize: 13,
                color: '#02071E',
                lineHeight: 1.6,
                background: '#fef3c7',
                borderLeft: '4px solid #fbbf24',
                borderRadius: '0 6px 6px 0',
                padding: '10px 14px',
                whiteSpace: 'pre-wrap' as const,
                fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
              }}
            >
              {sectionPlan!.crewNotes}
            </div>
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

              {sunConditions?.hasNight &&
                (() => {
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
    </div>
  )
}
