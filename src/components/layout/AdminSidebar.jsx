import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Car, MapPin, Shield,
  CreditCard, FileText, LogOut, Baby
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/drivers', icon: Car, label: 'Drivers' },
  { to: '/admin/trips', icon: MapPin, label: 'Live Trips' },
  { to: '/admin/safety', icon: Shield, label: 'Safety' },
  { to: '/admin/children', icon: Baby, label: 'Children & Routes' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Billing' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
]

export default function AdminSidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 w-[260px] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col z-30">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SafeRide Kids" className="h-20 w-auto brightness-0 invert" />
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">SafeRide Kids</h1>
            <p className="text-[11px] text-slate-400 font-medium">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 mt-2">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200 w-full"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
