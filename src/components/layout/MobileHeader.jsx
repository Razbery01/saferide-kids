import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function MobileHeader({ title }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!profile?.id) return

    fetchUnreadCount()

    const channel = supabase
      .channel('header-unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profile.id}` },
        () => { fetchUnreadCount() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  async function fetchUnreadCount() {
    if (!profile?.id) return
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', profile.id)
      .is('read_at', null)
    setUnreadCount(count || 0)
  }

  function handleBellClick() {
    const role = profile?.role || 'parent'
    navigate(`/${role}/messages`)
  }

  return (
    <header className="sticky top-0 glass border-b border-black/5 z-30">
      <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="SafeRide Kids" className="h-16 w-auto" />
          <h1 className="text-[15px] font-bold text-text-primary">{title || 'SafeRide Kids'}</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleBellClick}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition"
          >
            <Bell className="h-[18px] w-[18px] text-text-secondary" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={signOut} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/5 transition" title="Sign out">
            <LogOut className="h-[18px] w-[18px] text-text-secondary" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  )
}
