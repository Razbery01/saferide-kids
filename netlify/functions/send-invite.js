const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER
const APP_URL = process.env.URL || 'https://saferide-kids-production.up.railway.app'

const supaHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { phone, inviterName, inviterRole, routeCode, inviteType } = await req.json()

    if (!phone || !inviterName) {
      return new Response(JSON.stringify({ error: 'Phone and inviter name are required' }), { status: 400 })
    }

    // Normalize phone number (SA format)
    let normalized = phone.replace(/\s+/g, '').replace(/-/g, '')
    if (normalized.startsWith('0')) normalized = '+27' + normalized.slice(1)
    if (!normalized.startsWith('+')) normalized = '+' + normalized

    // Build invite link and message
    let message = ''
    let link = ''

    if (inviteType === 'parent_invites_driver') {
      link = `${APP_URL}/register?role=driver&ref=${encodeURIComponent(inviterName)}`
      message = `Hi! ${inviterName} is inviting you to join SafeRide Kids as a transport driver. Track trips, manage routes, and connect with parents. Sign up here: ${link}`
    } else if (inviteType === 'driver_invites_parent') {
      link = `${APP_URL}/register?role=parent&code=${routeCode || ''}&ref=${encodeURIComponent(inviterName)}`
      message = `Hi! ${inviterName} is your child's transport driver on SafeRide Kids. Track your child's trip in real-time.${routeCode ? ` Use route code: ${routeCode}` : ''} Sign up here: ${link}`
    } else {
      link = `${APP_URL}/register?ref=${encodeURIComponent(inviterName)}`
      message = `Hi! ${inviterName} invites you to SafeRide Kids — real-time school transport tracking. Sign up free: ${link}`
    }

    // Store invite in database
    const inviteRes = await fetch(`${SUPABASE_URL}/rest/v1/invites`, {
      method: 'POST',
      headers: supaHeaders,
      body: JSON.stringify({
        phone: normalized,
        inviter_name: inviterName,
        inviter_role: inviterRole,
        invite_type: inviteType,
        route_code: routeCode || null,
        status: 'pending',
      }),
    })

    // Send SMS via Twilio
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      // Twilio not configured — just store the invite
      return new Response(JSON.stringify({
        success: true,
        method: 'stored',
        message: 'Invite saved. SMS will be sent once Twilio is configured.',
        link,
      }), { status: 200 })
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const twilioAuth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)

    const smsRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: normalized,
        From: TWILIO_FROM,
        Body: message,
      }),
    })

    const smsData = await smsRes.json()

    if (smsRes.ok) {
      // Update invite status
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json()
        if (inviteData?.[0]?.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/invites?id=eq.${inviteData[0].id}`, {
            method: 'PATCH',
            headers: { ...supaHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: 'sent', twilio_sid: smsData.sid }),
          })
        }
      }

      return new Response(JSON.stringify({ success: true, method: 'sms' }), { status: 200 })
    } else {
      return new Response(JSON.stringify({
        success: true,
        method: 'stored',
        message: 'SMS failed to send, but invite was saved.',
        link,
      }), { status: 200 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to send invite' }), { status: 500 })
  }
}
