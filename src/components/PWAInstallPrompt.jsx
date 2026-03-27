import { useState } from 'react'
import { Download, X } from 'lucide-react'
import Button from './ui/Button'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function PWAInstallPrompt() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('pwa-dismissed') === '1' } catch { return false }
  })

  function handleDismiss() {
    setDismissed(true)
    try { sessionStorage.setItem('pwa-dismissed', '1') } catch { /* storage unavailable */ }
  }

  async function handleInstall() {
    await install()
    setDismissed(true)
  }

  if (!canInstall || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto bg-accent rounded-2xl p-4 shadow-2xl shadow-black/20 flex items-center gap-3">
        <img src="/icons/icon-96x96.png" alt="SafeRide Kids" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Install SafeRide Kids</p>
          <p className="text-xs text-white/60 mt-0.5">Add to your home screen for the best experience</p>
        </div>
        <Button size="sm" rounded onClick={handleInstall}>
          <Download className="h-4 w-4" /> Install
        </Button>
        <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
