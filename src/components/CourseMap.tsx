'use client'

import { useEffect, useRef, useState } from 'react'
import type { TrackPoint, AidStation } from '@/types/gpx'
import { trackToGeoJSON, getBounds } from '@/lib/map-utils'
import { Button } from '@/components/ui/button'

interface CourseMapProps {
  trackPoints: TrackPoint[]
  aidStations: AidStation[]
  className?: string
}

type MapStyle = 'streets' | 'satellite'

function updateMapData(
  map: import('mapbox-gl').Map,
  mapboxgl: (typeof import('mapbox-gl'))['default'],
  trackPoints: TrackPoint[],
  aidStations: AidStation[],
  markersRef: React.MutableRefObject<import('mapbox-gl').Marker[]>
) {
  if (trackPoints.length > 0) {
    const geojson = trackToGeoJSON(trackPoints) as GeoJSON.Feature
    const source = map.getSource('route') as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(geojson)
    } else {
      map.addSource('route', { type: 'geojson', data: geojson })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ef4444', 'line-width': 3 },
      })
    }

    const bounds = getBounds(trackPoints)
    map.fitBounds([bounds.sw, bounds.ne], { padding: 40, maxZoom: 14 })
  }

  for (const marker of markersRef.current) marker.remove()
  markersRef.current = []

  for (const station of aidStations) {
    const el = document.createElement('div')
    el.className = 'aid-station-marker'
    el.style.cssText = `
      background: white;
      border: 2px solid #3b82f6;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
      color: #1d4ed8;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `
    el.textContent = String(station.order + 1)

    const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(`
      <strong>${station.name}</strong><br>
      <span style="font-size:12px;color:#666">
        ${(station.distanceFromStart * 0.621371).toFixed(1)} mi from start
        ${station.hasDropBag ? ' · Drop Bag' : ''}
        ${station.hasCrewAccess ? ' · Crew Access' : ''}
      </span>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([station.lon, station.lat])
      .setPopup(popup)
      .addTo(map)

    markersRef.current.push(marker)
  }
}

export function CourseMap({ trackPoints, aidStations, className = '' }: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('mapbox-gl').Map | null>(null)
  const markersRef = useRef<import('mapbox-gl').Marker[]>([])
  const mapboxglRef = useRef<(typeof import('mapbox-gl'))['default'] | null>(null)
  const [style, setStyle] = useState<MapStyle>('streets')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Effect 1: initialize the map container once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file.')
      return
    }

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxglRef.current = mapboxgl
      mapboxgl.accessToken = MAPBOX_TOKEN

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-98, 39],
        zoom: 3,
      })

      mapRef.current = map

      map.on('load', () => {
        setLoaded(true)
      })

      map.on('error', () => {
        setError('Failed to load map. Please check your Mapbox token.')
      })
    }

    initMap().catch(() => setError('Failed to initialize map'))

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: add/update route and markers when data arrives or map finishes loading.
  // `loaded` is only true after 'load'/'style.load' fires, so the style is guaranteed ready.
  useEffect(() => {
    const map = mapRef.current
    const mapboxgl = mapboxglRef.current
    if (!map || !mapboxgl || !loaded) return

    updateMapData(map, mapboxgl, trackPoints, aidStations, markersRef)
  }, [loaded, trackPoints, aidStations])

  const toggleStyle = () => {
    if (!mapRef.current) return
    const newStyle = style === 'streets' ? 'satellite' : 'streets'
    const styleUrl =
      newStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/outdoors-v12'

    // style.load fires after setStyle clears all sources/layers — use it to re-trigger the data effect
    setLoaded(false)
    mapRef.current.once('style.load', () => {
      setLoaded(true)
    })
    setStyle(newStyle)
    mapRef.current.setStyle(styleUrl)
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} style={{ minHeight: 300 }}>
        <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ minHeight: 400 }}>
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ minHeight: 400 }} />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}
      {loaded && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 right-3 z-10"
          onClick={toggleStyle}
        >
          {style === 'streets' ? 'Satellite' : 'Terrain'}
        </Button>
      )}
    </div>
  )
}
