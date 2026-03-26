export const ROLES = {
  PARENT: 'parent',
  DRIVER: 'driver',
  ADMIN: 'admin',
}

export const TRIP_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
}

export const TRIP_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const EVENT_TYPES = {
  CHILD_PICKED_UP: 'child_picked_up',
  CHILD_DROPPED_OFF: 'child_dropped_off',
  AT_SCHOOL: 'at_school',
  TRIP_STARTED: 'trip_started',
  TRIP_ENDED: 'trip_ended',
  SOS: 'sos',
  SPEED_ALERT: 'speed_alert',
  ROUTE_DEVIATION: 'route_deviation',
}

export const SUBSCRIPTION_TIERS = {
  TRIAL: 'trial',
  BASIC: 'parent_basic',
  PREMIUM: 'parent_premium',
  DRIVER_PRO: 'driver_pro',
}

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const SUBSCRIPTION_PRICES = {
  parent_basic: { amount: 15, label: 'Basic', description: 'GPS tracking & alerts' },
  parent_premium: { amount: 99, label: 'Premium', description: 'Full features + trip PDF export' },
  driver_pro: { amount: 49, label: 'Driver Pro', description: 'Full driver features' },
}

export const SPEED_THRESHOLD_DEFAULT = 80 // km/h
export const GPS_UPDATE_INTERVAL = 5000 // 5 seconds
export const ETA_REFRESH_INTERVAL = 30000 // 30 seconds
export const TRIAL_DAYS = 7

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
export const ROUTE_CODE_REGEX = /^[A-Z0-9]{3,6}$/

export function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters'
  }
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must include uppercase, lowercase, and a number'
  }
  return null
}

export function validateGPSCoordinate(lat, lng) {
  if (lat !== null && lat !== '' && (isNaN(lat) || lat < -90 || lat > 90)) {
    return 'Latitude must be between -90 and 90'
  }
  if (lng !== null && lng !== '' && (isNaN(lng) || lng < -180 || lng > 180)) {
    return 'Longitude must be between -180 and 180'
  }
  return null
}

export function validateRouteCode(code) {
  if (!code || !ROUTE_CODE_REGEX.test(code)) {
    return 'Route code must be 3-6 alphanumeric characters'
  }
  return null
}
