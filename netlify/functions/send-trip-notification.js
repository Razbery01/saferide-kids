const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

function buildNotificationMessage(eventType, childName, timestamp) {
  const time = new Date(timestamp).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const messages = {
    child_picked_up: `${childName} was picked up at ${time}.`,
    child_dropped_off: `${childName} has arrived home safely at ${time}.`,
    at_school: `${childName} arrived at school at ${time}.`,
    trip_started: 'The school run has started.',
    trip_ended: 'The trip has ended.',
    sos: `SOS ALERT: Emergency triggered on ${childName}'s trip.`,
    speed_alert: 'Warning: vehicle speed exceeded the limit.',
    route_deviation: 'Alert: vehicle has deviated from the planned route.',
  }

  return messages[eventType] || `Trip update: ${eventType}`
}

async function getAffectedParents(tripId, childId) {
  // Get the route_id from the trip
  const tripRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trips?id=eq.${tripId}&select=route_id`,
    { headers: supabaseHeaders }
  )
  const trips = await tripRes.json()
  if (!trips.length) return []

  const routeId = trips[0].route_id

  // Build the query for child_route_assignments
  // If we have a specific child_id, filter by it; otherwise get all parents on the route
  let assignmentUrl = `${SUPABASE_URL}/rest/v1/child_route_assignments?route_id=eq.${routeId}&select=child_id,parent_id,children(full_name)`
  if (childId) {
    assignmentUrl += `&child_id=eq.${childId}`
  }

  const assignRes = await fetch(assignmentUrl, { headers: supabaseHeaders })
  const assignments = await assignRes.json()

  return assignments
}

async function getParentPushTokens(parentIds) {
  if (!parentIds.length) return []

  const idFilter = parentIds.map(id => `"${id}"`).join(',')
  const tokenRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_push_tokens?user_id=in.(${idFilter})&select=user_id,fcm_token`,
    { headers: supabaseHeaders }
  )
  const tokens = await tokenRes.json()
  return tokens
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

    // Supabase webhook sends the new row in `record`
    const event = payload.record || payload
    const { id, trip_id, event_type, child_id, created_at } = event

    if (!trip_id || !event_type) {
      return new Response(JSON.stringify({ error: 'Missing trip_id or event_type' }), { status: 400 })
    }

    // Get affected parents and their children
    const assignments = await getAffectedParents(trip_id, child_id)
    if (!assignments.length) {
      return new Response(JSON.stringify({ message: 'No parents to notify' }), { status: 200 })
    }

    // Collect unique parent IDs
    const parentIds = [...new Set(assignments.map(a => a.parent_id))]

    // Get push tokens for all affected parents
    const tokens = await getParentPushTokens(parentIds)
    if (!tokens.length) {
      return new Response(JSON.stringify({ message: 'No push tokens found' }), { status: 200 })
    }

    // Determine child name (use the first matched child or a default)
    const childName = assignments[0]?.children?.full_name || 'Your child'

    // Build notification
    const messageBody = buildNotificationMessage(event_type, childName, created_at || new Date().toISOString())
    const title = event_type === 'sos' ? 'SOS ALERT' : 'SafeRide Kids'

    // Send notifications to all tokens
    const results = await Promise.allSettled(
      tokens.map(t => sendPushNotification(t.fcm_token, title, messageBody))
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
    const failed = results.length - sent

    return new Response(
      JSON.stringify({ message: `Sent ${sent} notifications, ${failed} failed`, event_id: id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-trip-notification error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
