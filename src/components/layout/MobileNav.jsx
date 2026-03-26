import { NavLink } from 'react-router-dom'
import { Home, MapPin, Clock, MessageSquare, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const parentLinks = [
  { to: '/parent', icon: Home, label: 'Home' },
  { to: '/parent/tracking', icon: MapPin, label: 'Track' },
  { to: '/parent/trips', icon: Clock, label: 'Trips' },
  { to: '/parent/messages', icon: MessageSquare, label: 'Chat' },
  { to: '/parent/settings', icon: User, label: 'Account' },
]

const driverLinks = [
  { to: '/driver', icon: Home, label: 'Home' },
  { to: '/driver/routes', icon: MapPin, label: 'Routes' },
  { to: '/driver/trips', icon: Clock, label: 'Trips' },
  { to: '/driver/messages', icon: MessageSquare, label: 'Chat' },
  { to: '/driver/settings', icon: User, label: 'Account' },
]

export default function MobileNav() {
  const { profile } = useAuth()
  const links = profile?.role === 'driver' ? driverLinks : parentLinks

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/parent' || to === '/driver'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isActive ? 'bg-primary/10' : ''
                }`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
