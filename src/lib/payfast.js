export const PLAN_DETAILS = {
  parent_basic: { name: 'SafeRide Basic', amount: '15.00', frequency: '3', cycles: '0' },
  parent_premium: { name: 'SafeRide Premium', amount: '99.00', frequency: '3', cycles: '0' },
  driver_pro: { name: 'SafeRide Driver Pro', amount: '49.00', frequency: '3', cycles: '0' },
}
// frequency 3 = monthly, cycles 0 = indefinite

function submitPaymentForm(params, payUrl) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = payUrl

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    }
  })

  document.body.appendChild(form)
  form.submit()
}

export async function initiatePayment({ plan, user }) {
  const planInfo = PLAN_DETAILS[plan]
  if (!planInfo) throw new Error('Invalid subscription plan.')

  if (!user?.id || !user?.email) {
    throw new Error('User information is required for payment.')
  }

  // Use server-side function to generate payment params (keeps merchant keys off client)
  try {
    const res = await fetch('/.netlify/functions/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
      }),
    })

    if (res.ok) {
      const { params, payUrl } = await res.json()
      submitPaymentForm(params, payUrl)
      return
    }
  } catch {
    // Server function unavailable — fall back to client-side
  }

  // Fallback: client-side payment form (for local dev / when function is not deployed)
  const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID
  const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY

  if (!MERCHANT_ID || !MERCHANT_KEY) {
    throw new Error('Payment is not configured. Please contact support.')
  }

  const IS_SANDBOX = import.meta.env.VITE_PAYFAST_SANDBOX === 'true'
  const payUrl = IS_SANDBOX
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'

  const params = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: `${window.location.origin}/parent/settings?payment=success`,
    cancel_url: `${window.location.origin}/parent/settings?payment=cancelled`,
    notify_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-payfast-webhook`,
    name_first: (user.full_name?.split(' ')[0] || '').slice(0, 100),
    name_last: (user.full_name?.split(' ').slice(1).join(' ') || '').slice(0, 100),
    email_address: user.email,
    m_payment_id: `${user.id}_${plan}_${Date.now()}`,
    amount: planInfo.amount,
    item_name: planInfo.name,
    item_description: `${planInfo.name} Monthly Subscription`,
    subscription_type: '1',
    frequency: planInfo.frequency,
    cycles: planInfo.cycles,
    custom_str1: user.id,
    custom_str2: plan,
  }

  submitPaymentForm(params, payUrl)
}
