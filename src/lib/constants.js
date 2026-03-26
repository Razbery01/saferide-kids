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
