import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let initialized = false
let mapsLib = null
let markerLib = null

async function init() {
  if (initialized) return

  setOptions({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: 'weekly',
  })

  initialized = true
}

export async function loadGoogleMaps() {
  await init()

  if (!mapsLib) {
    mapsLib = await importLibrary('maps')
  }

  return mapsLib
}

export async function loadPlaces() {
  await init()
  return await importLibrary('places')
}

export async function loadGeometry() {
  await init()
  return await importLibrary('geometry')
}

export function getGoogle() {
  return window.google
}

export function createMap(element, options = {}) {
  if (!mapsLib) throw new Error('Google Maps not loaded — call loadGoogleMaps() first')

  const defaultCenter = { lat: -29.8587, lng: 31.0218 } // Durban, KZN

  return new mapsLib.Map(element, {
    center: defaultCenter,
    zoom: 14,
    disableDefaultUI: true,
    zoomControl: true,
    mapId: 'saferide-kids-map',
    gestureHandling: 'greedy',
    ...options,
  })
}

export function createVehicleMarker(map, position) {
  if (!window.google?.maps) return null

  return new window.google.maps.Marker({
    map,
    position,
    icon: {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7,
      fillColor: '#0D9468',
      fillOpacity: 1,
      strokeColor: '#065F46',
      strokeWeight: 2,
      rotation: 0,
    },
    title: 'Vehicle',
  })
}

export function createPinMarker(map, position, label, color = '#3B82F6') {
  if (!window.google?.maps) return null

  return new window.google.maps.Marker({
    map,
    position,
    label: {
      text: label.charAt(0),
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '12px',
    },
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 14,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
    },
    title: label,
  })
}

export function updateMarkerPosition(marker, position, smooth = true) {
  if (!marker || !window.google?.maps) return

  if (smooth) {
    const start = marker.getPosition()
    const end = new window.google.maps.LatLng(position.lat, position.lng)
    const steps = 10
    let step = 0

    const interval = setInterval(() => {
      step++
      const lat = start.lat() + (end.lat() - start.lat()) * (step / steps)
      const lng = start.lng() + (end.lng() - start.lng()) * (step / steps)
      marker.setPosition({ lat, lng })
      if (step >= steps) clearInterval(interval)
    }, 50)
  } else {
    marker.setPosition(position)
  }
}

export function drawRoute(map, path, color = '#0D9468') {
  if (!window.google?.maps) return null

  return new window.google.maps.Polyline({
    map,
    path,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 4,
  })
}

export function fitBounds(map, positions) {
  if (!window.google?.maps || !positions.length) return

  const bounds = new window.google.maps.LatLngBounds()
  positions.forEach(pos => bounds.extend(pos))
  map.fitBounds(bounds, { padding: 60 })
}
