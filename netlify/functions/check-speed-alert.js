const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const DEFAULT_SPEED_THRESHOLD_KMH = 80
const ALERT_COOLDOWN_MINUTES = 5

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const payload = await req.json()
    const position = payload.record || payload
    const { trip_id, speed_kmh, created_at } = position

    if (!trip_id || speed_kmh == null) {
      return new Response(JSON.stringify({ error: 'Missing trip_id or speed_kmh' }), { status: 400 })
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

    // Get all parents on this route to check their speed thresholds
    const assignRes = await fetch(
      `${SUPABASE_URL}/rest/v1/child_route_assignments?route_id=eq.${routeId}&select=parent_id`,
      { headers: supabaseHeaders }
    )
    const assignments = await assignRes.json()
    const parentIds = [...new Set(assignments.map(a => a.parent_id))]

    // Determine the lowest speed threshold among parents
    // Try to get thresholds from user profiles/metadata
    let threshold = DEFAULT_SPEED_THRESHOLD_KMH

    if (parentIds.length) {
      const idFilter = parentIds.map(id => `"${id}"`).join(',')
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${idFilter})&select=id,speed_threshold_kmh`,
        { headers: supabaseHeaders }
      )
      const profiles = await profileRes.json()

      // Use the lowest threshold among all parents (most cautious)
      const thresholds = profiles
        .map(p => p.speed_threshold_kmh)
        .filter(t => t != null && t > 0)

      if (thresholds.length) {
        threshold = Math.min(...thresholds)
      }
    }

    // Check if speed exceeds the threshold
    if (speed_kmh <= threshold) {
      return new Response(
        JSON.stringify({ message: 'Speed within limit', speed_kmh, threshold }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check for recent speed_alert events on this trip (cooldown window)
    const cooldownTime = new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000).toISOString()
    const recentAlertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/trip_events?trip_id=eq.${trip_id}&event_type=eq.speed_alert&created_at=gte.${cooldownTime}&select=id&limit=1`,
      { headers: supabaseHeaders }
    )
    const recentAlerts = await recentAlertRes.json()

    if (recentAlerts.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Speed alert already sent within cooldown window' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Insert a speed_alert event into trip_events
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trip_events`, {
      method: 'POST',
      headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        trip_id,
        event_type: 'speed_alert',
        metadata: {
          speed_kmh,
          threshold,
          position_timestamp: created_at,
        },
      }),
    })

    if (!insertRes.ok) {
      const err = await insertRes.text()
      console.error('Failed to insert speed_alert event:', err)
      return new Response(JSON.stringify({ error: 'Failed to create speed alert event' }), { status: 500 })
    }

    const inserted = await insertRes.json()

    return new Response(
      JSON.stringify({
        message: 'Speed alert created',
        event_id: inserted[0]?.id,
        speed_kmh,
        threshold,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-speed-alert error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
