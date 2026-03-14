export interface CuratedRace {
  id: string
  name: string
  location: string
  distance: string
  typicalMonth: string
  gpxPath: string
}

export const CURATED_RACES: CuratedRace[] = [
  {
    id: 'western-states-100',
    name: 'Western States 100',
    location: 'Squaw Valley to Auburn, CA',
    distance: '100 miles',
    typicalMonth: 'June',
    gpxPath: '/gpx/western-states-100.gpx',
  },
  {
    id: 'leadville-trail-100',
    name: 'Leadville Trail 100',
    location: 'Leadville, CO',
    distance: '100 miles',
    typicalMonth: 'August',
    gpxPath: '/gpx/leadville-trail-100.gpx',
  },
  {
    id: 'hardrock-100',
    name: 'Hardrock 100',
    location: 'Silverton, CO',
    distance: '100 miles',
    typicalMonth: 'July',
    gpxPath: '/gpx/hardrock-100.gpx',
  },
]
