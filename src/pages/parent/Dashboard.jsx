import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, MessageSquare, Plus, ChevronRight, Users, Shield, Navigation, Sparkles, Settings, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { format, differenceInDays } from 'date-fns'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const [children, setChildren] = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [childStatuses, setChildStatuses] = useState({}) // { childId: 'at_home' | 'on_route' | 'at_school' }
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [profile])

  // Subscribe to trips table for realtime status changes
  useEffect(() => {
    if (children.length === 0) return

    const channel = supabase
      .channel('dashboard-trip-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [children])

  async function fetchData() {
    if (!profile) return
    try {
      const { data: childData } = await supabase.from('children').select('*, child_route_assignments(route_id)').eq('parent_id', profile.id)
      setChildren(childData || [])
      if (childData?.length > 0) {
        const childIds = childData.map(c => c.id)
        const allAssignments = childData.flatMap(c => (c.child_route_assignments || []).map(a => ({ childId: c.id, routeId: a.route_id })))
        const routeIds = [...new Set(allAssignments.map(a => a.routeId))]

        if (routeIds.length > 0) {
          const { data: tripData } = await supabase.from('trips').select('*, routes(name)').in('route_id', routeIds).eq('status', 'active')
          setActiveTrips(tripData || [])

          // Build child status map
          const statuses = {}
          for (const child of childData) {
            const childRouteIds = (child.child_route_assignments || []).map(a => a.route_id)
            const childActiveTrips = (tripData || []).filter(t => childRouteIds.includes(t.route_id))

            if (childActiveTrips.length === 0) {
              statuses[child.id] = 'at_home'
            } else {
              // Check if any active trip has an at_school event
              const tripIds = childActiveTrips.map(t => t.id)
              const { data: schoolEvents } = await supabase
                .from('trip_events')
                .select('id')
                .in('trip_id', tripIds)
                .eq('event_type', 'at_school')
                .limit(1)

              statuses[child.id] = schoolEvents?.length > 0 ? 'at_school' : 'on_route'
            }
          }
          setChildStatuses(statuses)
        } else {
          setActiveTrips([])
          const statuses = {}
          childData.forEach(c => { statuses[c.id] = 'at_home' })
          setChildStatuses(statuses)
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(childId) {
    const status = childStatuses[childId] || 'at_home'
    switch (status) {
      case 'on_route':
        return <Badge variant="warning" dot>On Route</Badge>
      case 'at_school':
        return <Badge variant="info" dot>At School</Badge>
      case 'at_home':
      default:
        return <Badge variant="success" dot>At Home</Badge>
    }
  }

  const trialDaysLeft = profile?.trial_ends_at ? Math.max(0, differenceInDays(new Date(profile.trial_ends_at), new Date())) : 0
  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const services = [
    { to: '/parent/tracking', icon: MapPin, label: 'Live Track', color: 'bg-primary', iconColor: 'text-white' },
    { to: '/parent/trips', icon: Clock, label: 'Trip History', color: 'bg-blue-500', iconColor: 'text-white' },
    { to: '/parent/messages', icon: MessageSquare, label: 'Messages', color: 'bg-violet-500', iconColor: 'text-white' },
    { to: '/parent/settings', icon: Settings, label: 'Settings', color: 'bg-gray-700', iconColor: 'text-white' },
  ]

  return (
    <div className="space-y-5 fade-in">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-text-secondary text-sm">{greeting()}</p>
        <h1 className="text-[22px] font-bold text-text-primary tracking-tight">{firstName} 👋</h1>
      </div>

      {/* Active trip banner */}
      {activeTrips.length > 0 && (
        <Link to="/parent/tracking">
          <div className="bg-accent text-white rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Trip in progress</span>
              </div>
              <p className="font-bold text-lg">{activeTrips[0].routes?.name || 'School Run'}</p>
              <p className="text-sm text-white/60 mt-0.5">
                Started {activeTrips[0].started_at ? format(new Date(activeTrips[0].started_at), 'h:mm a') : ''}
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm text-white/80">
                <Navigation className="h-3.5 w-3.5" />
                <span>Tap to track live</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Service grid — Careem style */}
      <Card>
        <div className="grid grid-cols-4 gap-3">
          {services.map(({ to, icon: Icon, label, color, iconColor }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-2 py-1">
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
                <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold text-text-primary text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Trial banner */}
      {profile?.subscription_tier === 'trial' && trialDaysLeft > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">{trialDaysLeft} days left on free trial</p>
            <p className="text-xs text-text-secondary">Upgrade to keep all features</p>
          </div>
          <Link to="/parent/settings">
            <Button size="xs" rounded>Upgrade</Button>
          </Link>
        </div>
      )}

      {/* Children */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-text-primary">My Children</h2>
          <Link to="/parent/settings">
            <button className="text-xs font-semibold text-primary flex items-center gap-0.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </Link>
        </div>

        {children.length === 0 ? (
          <Card className="text-center py-10">
            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-text-muted" />
            </div>
            <p className="font-bold text-text-primary text-[15px]">No children added</p>
            <p className="text-sm text-text-secondary mt-1 mb-4">Add your child to start tracking their trips</p>
            <Link to="/parent/settings">
              <Button size="sm" rounded><Plus className="h-4 w-4" /> Add Child</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {children.map((child) => (
              <Card key={child.id} hover className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-base">
                  {child.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-text-primary truncate">{child.full_name}</p>
                  <p className="text-[12px] text-text-secondary truncate">
                    {child.school_name || 'No school set'} {child.grade ? `· Gr ${child.grade}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(child.id)}
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Safety tip */}
      <Card className="bg-red-50 border border-red-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">SOS Emergency</p>
            <p className="text-xs text-text-secondary mt-0.5">Go to Live Track to access the SOS button if your child is in danger.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
