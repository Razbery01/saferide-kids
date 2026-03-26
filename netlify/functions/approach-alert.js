const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const APPROACH_DISTANCE_METERS = 1000 // ~5 min at 40 km/h

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

async function sendPushNotification(fcmToken, title, body) {
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: { title, body },
      data: { title, body },
    }),
  })

  return res.ok
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

    // Get all children assigned to this route, with their pickup stop info and parent details
    const assignRes = await fetch(
      `${SUPABASE_URL}/rest/v1/child_route_assignments?route_id=eq.${routeId}&select=id,child_id,parent_id,stop_id,children(full_name),route_stops(latitude,longitude,name)`,
      { headers: supabaseHeaders }
    )
    const assignments = await assignRes.json()

    if (!assignments.length) {
      return new Response(
        JSON.stringify({ message: 'No children assigned to this route' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const alerts = []

    for (const assignment of assignments) {
      const stop = assignment.route_stops
      if (!stop || stop.latitude == null || stop.longitude == null) continue

      // Calculate distance from vehicle to this child's pickup stop
      const distance = haversineDistance(latitude, longitude, stop.latitude, stop.longitude)

      if (distance > APPROACH_DISTANCE_METERS) continue

      const childId = assignment.child_id
      const childName = assignment.children?.full_name || 'Your child'
      const parentId = assignment.parent_id

      // Check if an approach event already exists for this child on this trip
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/trip_events?trip_id=eq.${trip_id}&event_type=eq.approach&child_id=eq.${childId}&select=id&limit=1`,
        { headers: supabaseHeaders }
      )
      const existing = await existingRes.json()

      if (existing.length > 0) continue // Already notified for this child on this trip

      // Insert approach event
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trip_events`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          trip_id,
          event_type: 'approach',
          child_id: childId,
          metadata: {
            distance_m: Math.round(distance),
            stop_name: stop.name,
            latitude,
            longitude,
          },
        }),
      })

      if (!insertRes.ok) {
        console.error(`Failed to insert approach event for child ${childId}`)
        continue
      }

      // Get parent's push tokens
      const tokenRes = await fetch(
        `${SUPABASE_URL}/rest/v1/user_push_tokens?user_id=eq.${parentId}&select=fcm_token`,
        { headers: supabaseHeaders }
      )
      const tokens = await tokenRes.json()

      const estimatedMinutes = Math.max(1, Math.round(distance / (40000 / 60))) // rough estimate at 40km/h
      const body = `${childName}'s ride is approaching - about ${estimatedMinutes} min away.`

      // Send push to all of this parent's devices
      for (const token of tokens) {
        await sendPushNotification(token.fcm_token, 'SafeRide Kids', body)
      }

      alerts.push({ child_id: childId, child_name: childName, distance_m: Math.round(distance) })
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${assignments.length} assignments, sent ${alerts.length} approach alerts`,
        alerts,
      }),
      { status: alerts.length > 0 ? 201 : 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('approach-alert error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
