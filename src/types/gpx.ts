export interface TrackPoint {
  lat: number
  lon: number
  ele: number
  time?: string
}

export interface Waypoint {
  lat: number
  lon: number
  ele: number
  name: string
}

export interface AidStation {
  order: number
  name: string
  physicalName?: string   // groups repeated visits of the same location; defaults to name
  lat: number
  lon: number
  distanceFromStart: number
  distanceFromPrev: number
  /** @deprecated superseded by grossClimbM / grossDescentM — always 0 */
  elevationGain: number
  grossClimbM: number      // total metres climbed in segment from prev station
  grossDescentM: number    // total metres descended in segment from prev station
  hasDropBag: boolean
  hasCrewAccess: boolean
  visitNumber?: number    // 1-indexed per unique station name; defaults to 1
  isStart?: boolean
  isFinish?: boolean
  // PRD-022: crew location data (only meaningful when hasCrewAccess === true)
  crewParkingCoords?: { lat: number; lng: number }
  crewParkingType?: 'parking-lot' | 'side-of-road' | 'trailhead' | 'drop-off'
  crewLocationNotes?: string  // free text, max 500 chars
  // PRD-025: admin-only provenance metadata; never copied to user races
  crewParkingCoordsSource?: 'gpx' | 'admin'
}

export interface ParsedGPX {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
}
