/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCKBeM7tIGeC8GqLC4Urd70SwgUvKb_WNA',
  authDomain: 'saferide-kids.firebaseapp.com',
  projectId: 'saferide-kids',
  messagingSenderId: '95317606536',
  appId: '1:95317606536:web:4818db9fa96dd2cfa7df3d',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  if (title) {
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    })
  }
})
