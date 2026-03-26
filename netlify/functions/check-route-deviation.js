const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const DEVIATION_THRESHOLD_METERS = 500

/**
 * Calculate distance between two lat/lng points using the haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate the minimum distance from a point to any route stop.
 */
function minDistanceToStops(lat, lng, stops) {
  if (!stops.length) return Infinity

  let minDist = Infinity
  for (const stop of stops) {
    const dist = haversineDistance(lat, lng, stop.latitude, stop.longitude)
    if (dist < minDist) {
      minDist = dist
    }
  }
  return minDist
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const payload = await req.json()
    const position = payload.record || payload
    const { trip_id, latitude, longitude } = position

    if (!trip_id || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: 'Missing trip_id, latitude, or longitude' }), { status: 400 })
    }

    // Get the trip's route_id
    const tripRes = await fetch(
      `${SUPABASE_URL}/rest/v1/trips?id=eq.${trip_id}&select=route_id`,
      { headers: supabaseHeaders }
    )
    const trips = await tripRes.json()
    if (!trips.length) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), { status: 404 })
    }

    const routeId = trips[0].route_id

    // Get all stops on this route
    const stopsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/route_stops?route_id=eq.${routeId}&select=id,latitude,longitude,name`,
      { headers: supabaseHeaders }
    )
    const stops = await stopsRes.json()

    if (!stops.length) {
      return new Response(
        JSON.stringify({ message: 'No route stops found, skipping deviation check' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if current position is far from all stops
    const distToNearest = minDistanceToStops(latitude, longitude, stops)
    const isDeviated = distToNearest > DEVIATION_THRESHOLD_METERS

    if (!isDeviated) {
      return new Response(
        JSON.stringify({ message: 'Position within route corridor', distance_to_nearest_m: Math.round(distToNearest) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Current position is deviated. Check if the previous position was also deviated.
    // Get the 2nd most recent position for this trip (the one before the current insert).
    const prevRes = await fetch(
      `${SUPABASE_URL}/rest/v1/trip_positions?trip_id=eq.${trip_id}&order=created_at.desc&limit=2&select=latitude,longitude`,
      { headers: supabaseHeaders }
    )
    const prevPositions = await prevRes.json()

    // We need at least 2 readings; the first is the current one (just inserted), the second is the previous
    if (prevPositions.length < 2) {
      return new Response(
        JSON.stringify({ message: 'First deviated reading, waiting for consecutive confirmation' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const prevPosition = prevPositions[1]
    const prevDistToNearest = minDistanceToStops(prevPosition.latitude, prevPosition.longitude, stops)
    const prevWasDeviated = prevDistToNearest > DEVIATION_THRESHOLD_METERS

    if (!prevWasDeviated) {
      return new Response(
        JSON.stringify({ message: 'Only one consecutive deviated reading, not triggering alert yet' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Two consecutive deviated readings. Check if a route_deviation event already exists for this trip.
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/trip_events?trip_id=eq.${trip_id}&event_type=eq.route_deviation&select=id&limit=1`,
      { headers: supabaseHeaders }
    )
    const existingAlerts = await existingRes.json()

    if (existingAlerts.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Route deviation already reported for this trip' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Insert a route_deviation event
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trip_events`, {
      method: 'POST',
      headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        trip_id,
        event_type: 'route_deviation',
        metadata: {
          latitude,
          longitude,
          distance_to_nearest_stop_m: Math.round(distToNearest),
          prev_distance_m: Math.round(prevDistToNearest),
        },
      }),
    })

    if (!insertRes.ok) {
      const err = await insertRes.text()
      console.error('Failed to insert route_deviation event:', err)
      return new Response(JSON.stringify({ error: 'Failed to create route deviation event' }), { status: 500 })
    }

    const inserted = await insertRes.json()

    return new Response(
      JSON.stringify({
        message: 'Route deviation alert created',
        event_id: inserted[0]?.id,
        distance_to_nearest_m: Math.round(distToNearest),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-route-deviation error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
