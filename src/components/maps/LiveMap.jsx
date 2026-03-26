import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps, createMap, createVehicleMarker, createPinMarker, updateMarkerPosition, drawRoute, fitBounds } from '../../lib/maps'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function LiveMap({
  vehiclePosition,
  schoolPosition,
  homePosition,
  breadcrumbs = [],
  height = '300px',
  className = '',
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const vehicleMarker = useRef(null)
  const routeLine = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState(null)

  // Initialize map
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        await loadGoogleMaps()
        if (!mounted || !mapRef.current) return

        const center = vehiclePosition
          ? { lat: vehiclePosition.lat, lng: vehiclePosition.lng }
          : schoolPosition
          ? { lat: schoolPosition.lat, lng: schoolPosition.lng }
          : { lat: -29.8587, lng: 31.0218 }

        mapInstance.current = createMap(mapRef.current, { center, zoom: 14 })

        // Add school pin
        if (schoolPosition) {
          createPinMarker(mapInstance.current, schoolPosition, 'School', '#3B82F6')
        }

        // Add home pin
        if (homePosition) {
          createPinMarker(mapInstance.current, homePosition, 'Home', '#8B5CF6')
        }

        // Add vehicle marker
        if (vehiclePosition) {
          vehicleMarker.current = createVehicleMarker(mapInstance.current, vehiclePosition)
        }

        setMapReady(true)
      } catch (err) {
        console.error('Map init error:', err)
        setError('Unable to load map')
      }
    }

    init()
    return () => { mounted = false }
  }, [])

  // Update vehicle position
  useEffect(() => {
    if (!mapReady || !vehiclePosition || !mapInstance.current) return

    if (!vehicleMarker.current) {
      vehicleMarker.current = createVehicleMarker(mapInstance.current, vehiclePosition)
    } else {
      updateMarkerPosition(vehicleMarker.current, vehiclePosition)
    }

    mapInstance.current.panTo(vehiclePosition)
  }, [vehiclePosition, mapReady])

  // Update breadcrumb trail
  useEffect(() => {
    if (!mapReady || !mapInstance.current || breadcrumbs.length < 2) return

    if (routeLine.current) routeLine.current.setMap(null)
    routeLine.current = drawRoute(mapInstance.current, breadcrumbs, '#0D9468')
  }, [breadcrumbs, mapReady])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-2xl ${className}`} style={{ height }}>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <LoadingSpinner />
        </div>
      )}
    </div>
  )
}
