import { Loader } from '@googlemaps/js-api-loader'

let loader = null
let google = null

export async function loadGoogleMaps() {
  if (google) return google

  if (!loader) {
    loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    })
  }

  google = await loader.load()
  return google
}

export function createMap(element, options = {}) {
  if (!google) throw new Error('Google Maps not loaded')

  const defaultCenter = { lat: -29.8587, lng: 31.0218 } // Durban, KZN

  return new google.maps.Map(element, {
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
  if (!google) return null

  return new google.maps.Marker({
    map,
    position,
    icon: {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
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
  if (!google) return null

  return new google.maps.Marker({
    map,
    position,
    label: {
      text: label.charAt(0),
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '12px',
    },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
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
  if (!marker || !google) return

  if (smooth) {
    const start = marker.getPosition()
    const end = new google.maps.LatLng(position.lat, position.lng)
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
  if (!google) return null

  return new google.maps.Polyline({
    map,
    path,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 4,
  })
}

export function fitBounds(map, positions) {
  if (!google || !positions.length) return

  const bounds = new google.maps.LatLngBounds()
  positions.forEach(pos => bounds.extend(pos))
  map.fitBounds(bounds, { padding: 60 })
}
