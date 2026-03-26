const PLAN_DETAILS = {
  parent_basic: { name: 'SafeRide Basic', amount: '15.00', frequency: '3', cycles: '0' },
  parent_premium: { name: 'SafeRide Premium', amount: '99.00', frequency: '3', cycles: '0' },
  driver_pro: { name: 'SafeRide Driver Pro', amount: '49.00', frequency: '3', cycles: '0' },
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { plan, userId, email, fullName } = await req.json()

    // Validate plan
    const planInfo = PLAN_DETAILS[plan]
    if (!planInfo) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400 })
    }

    // Validate required fields
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const merchantId = process.env.PAYFAST_MERCHANT_ID
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY

    if (!merchantId || !merchantKey) {
      return new Response(JSON.stringify({ error: 'Payment not configured' }), { status: 500 })
    }

    const isSandbox = process.env.PAYFAST_SANDBOX === 'true'
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

    const nameParts = (fullName || '').split(' ')
    const params = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${process.env.URL || 'http://localhost:5173'}/parent/settings?payment=success`,
      cancel_url: `${process.env.URL || 'http://localhost:5173'}/parent/settings?payment=cancelled`,
      notify_url: supabaseUrl ? `${supabaseUrl}/functions/v1/handle-payfast-webhook` : '',
      name_first: (nameParts[0] || '').slice(0, 100),
      name_last: (nameParts.slice(1).join(' ') || '').slice(0, 100),
      email_address: email,
      m_payment_id: `${userId}_${plan}_${Date.now()}`,
      amount: planInfo.amount,
      item_name: planInfo.name,
      item_description: `${planInfo.name} Monthly Subscription`,
      subscription_type: '1',
      frequency: planInfo.frequency,
      cycles: planInfo.cycles,
      custom_str1: userId,
      custom_str2: plan,
    }

    const payUrl = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process'

    return new Response(JSON.stringify({ params, payUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
