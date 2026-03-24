export function tzAbbr(ianaTimezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone, timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ianaTimezone
  } catch { return ianaTimezone }
}

export function tzOffset(ianaTimezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone, timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return (parts.find((p) => p.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC')
  } catch { return '' }
}

export function guessTimezoneFromCoords(_lat: number, lon: number): string {
  if (lon < -168) return 'Pacific/Honolulu'
  if (lon < -140) return 'America/Anchorage'
  if (lon < -115) return 'America/Los_Angeles'
  if (lon < -104) return 'America/Denver'
  if (lon < -87)  return 'America/Chicago'
  if (lon < -52)  return 'America/New_York'
  return 'UTC'
}

export const TIMEZONE_GROUPS = [
  {
    label: 'United States',
    options: [
      { iana: 'America/Los_Angeles', name: 'Pacific Time' },
      { iana: 'America/Denver',      name: 'Mountain Time' },
      { iana: 'America/Phoenix',     name: 'Mountain Time (Arizona)' },
      { iana: 'America/Chicago',     name: 'Central Time' },
      { iana: 'America/New_York',    name: 'Eastern Time' },
      { iana: 'America/Anchorage',   name: 'Alaska Time' },
      { iana: 'Pacific/Honolulu',    name: 'Hawaii Time' },
    ],
  },
  {
    label: 'International',
    options: [
      { iana: 'UTC',               name: 'UTC' },
      { iana: 'Europe/London',     name: 'Greenwich / BST' },
      { iana: 'Europe/Paris',      name: 'Central European Time' },
      { iana: 'Europe/Helsinki',   name: 'Eastern European Time' },
      { iana: 'Australia/Sydney',  name: 'Australian Eastern Time' },
      { iana: 'Pacific/Auckland',  name: 'New Zealand Time' },
      { iana: 'Asia/Tokyo',        name: 'Japan Standard Time' },
    ],
  },
]
