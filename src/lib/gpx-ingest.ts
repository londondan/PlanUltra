import { parseGPX, extractAidStations } from '@/lib/gpx-parser'
import type { AidStation } from '@/types/gpx'

/**
 * Parse a GPX string and extract aid stations.
 * Throws on invalid GPX so callers can gate race creation on a clean parse.
 */
export function parseAndExtractStations(gpxString: string): AidStation[] {
  const { trackPoints, waypoints } = parseGPX(gpxString)
  return extractAidStations(waypoints, trackPoints)
}
