const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY
const PASSPHRASE = import.meta.env.VITE_PAYFAST_PASSPHRASE
const IS_SANDBOX = import.meta.env.VITE_PAYFAST_SANDBOX === 'true'

const PAYFAST_URL = IS_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process'

export const PLAN_DETAILS = {
  parent_basic: { name: 'SafeRide Basic', amount: '15.00', frequency: '3', cycles: '0' },
  parent_premium: { name: 'SafeRide Premium', amount: '99.00', frequency: '3', cycles: '0' },
  driver_pro: { name: 'SafeRide Driver Pro', amount: '49.00', frequency: '3', cycles: '0' },
}
// frequency 3 = monthly, cycles 0 = indefinite

export function initiatePayment({ plan, user, returnUrl, cancelUrl, notifyUrl }) {
  const planInfo = PLAN_DETAILS[plan]
  if (!planInfo) throw new Error('Invalid plan: ' + plan)

  const params = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: returnUrl || `${window.location.origin}/parent/settings?payment=success`,
    cancel_url: cancelUrl || `${window.location.origin}/parent/settings?payment=cancelled`,
    notify_url: notifyUrl || 'https://dllmbsbukeipiggaydkn.supabase.co/functions/v1/handle-payfast-webhook',
    name_first: user.full_name?.split(' ')[0] || '',
    name_last: user.full_name?.split(' ').slice(1).join(' ') || '',
    email_address: user.email || '',
    m_payment_id: `${user.id}_${plan}_${Date.now()}`,
    amount: planInfo.amount,
    item_name: planInfo.name,
    item_description: `${planInfo.name} Monthly Subscription`,
    subscription_type: '1', // 1 = subscription
    frequency: planInfo.frequency,
    cycles: planInfo.cycles,
    custom_str1: user.id,
    custom_str2: plan,
  }

  // Build form and submit
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = PAYFAST_URL

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
