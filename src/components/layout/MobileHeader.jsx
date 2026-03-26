import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function MobileHeader({ title }) {
  const { profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 glass border-b border-black/5 z-30">
      <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="SafeRide Kids" className="h-16 w-auto" />
          <h1 className="text-[15px] font-bold text-text-primary">{title || 'SafeRide Kids'}</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition">
            <Bell className="h-[18px] w-[18px] text-text-secondary" strokeWidth={2} />
          </button>
          <button onClick={signOut} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition" title="Sign out">
            <LogOut className="h-[18px] w-[18px] text-text-secondary" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}
