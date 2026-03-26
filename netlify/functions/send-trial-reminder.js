const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
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
  // Accept both GET (cron) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    // Calculate the date that is exactly 2 days from now (start and end of that day)
    const now = new Date()
    const twoDaysFromNow = new Date(now)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    // Start and end of the target day in ISO format
    const dayStart = new Date(twoDaysFromNow)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(twoDaysFromNow)
    dayEnd.setHours(23, 59, 59, 999)

    // Query profiles where trial_ends_at falls within the target day
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?trial_ends_at=gte.${dayStart.toISOString()}&trial_ends_at=lte.${dayEnd.toISOString()}&select=id,full_name,trial_ends_at`,
      { headers: supabaseHeaders }
    )
    const profiles = await profilesRes.json()

    if (!profiles.length) {
      return new Response(
        JSON.stringify({ message: 'No users with trial ending in 2 days' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userIds = profiles.map(p => p.id)
    const idFilter = userIds.map(id => `"${id}"`).join(',')

    // Get push tokens for all these users
    const tokenRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_push_tokens?user_id=in.(${idFilter})&select=user_id,fcm_token`,
      { headers: supabaseHeaders }
    )
    const tokens = await tokenRes.json()

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ message: `Found ${profiles.length} users but none have push tokens` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Group tokens by user_id
    const tokensByUser = {}
    for (const token of tokens) {
      if (!tokensByUser[token.user_id]) {
        tokensByUser[token.user_id] = []
      }
      tokensByUser[token.user_id].push(token.fcm_token)
    }

    const title = 'SafeRide Kids'
    const body = 'Your free trial ends in 2 days. Upgrade now to keep tracking.'

    let sent = 0
    let failed = 0

    // Send notifications
    const sendPromises = []
    for (const userId of Object.keys(tokensByUser)) {
      for (const fcmToken of tokensByUser[userId]) {
        sendPromises.push(
          sendPushNotification(fcmToken, title, body)
            .then(ok => { if (ok) sent++; else failed++ })
            .catch(() => { failed++ })
        )
      }
    }

    await Promise.allSettled(sendPromises)

    return new Response(
      JSON.stringify({
        message: `Trial reminders: ${profiles.length} users found, ${sent} notifications sent, ${failed} failed`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-trial-reminder error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
