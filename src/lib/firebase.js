import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { supabase } from './supabase'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let messaging = null

export function initFirebase() {
  if (app) return { app, messaging }

  try {
    app = initializeApp(firebaseConfig)
    if ('Notification' in window && 'serviceWorker' in navigator) {
      messaging = getMessaging(app)
    }
  } catch {
    // Firebase init failed — push notifications will be unavailable
  }

  return { app, messaging }
}

export async function requestNotificationPermission(userId) {
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })

    if (token && userId) {
      // Store token in Supabase
      await supabase.from('user_push_tokens').upsert(
        { user_id: userId, token, platform: 'web' },
        { onConflict: 'user_id,token' }
      )
    }

    return token
  } catch {
    return null
  }
}

export function onPushMessage(callback) {
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {}

    // Show in-app notification
    if (callback) callback(payload)

    // Also show browser notification if page is visible
    if (Notification.permission === 'granted' && title) {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      })
    }
  })
}
