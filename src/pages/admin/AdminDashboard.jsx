import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Users, Car, Baby, MapPin, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { SUBSCRIPTION_PRICES } from '../../lib/constants'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ parents: 0, drivers: 0, children: 0, activeTrips: 0 })
  const [recentAlerts, setRecentAlerts] = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [revenueData, setRevenueData] = useState({ mrr: 0, trialTotal: 0, trialConverted: 0 })

  useEffect(() => {
    fetchStats()
    fetchActiveTrips()
    fetchAlerts()
    fetchRevenue()
  }, [])

  async function fetchStats() {
    const [parents, drivers, children, trips] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase.from('children').select('id', { count: 'exact', head: true }),
      supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ])
    setStats({
      parents: parents.count || 0,
      drivers: drivers.count || 0,
      children: children.count || 0,
      activeTrips: trips.count || 0,
    })
  }

  async function fetchActiveTrips() {
    const { data } = await supabase
      .from('trips')
      .select('*, routes(name), drivers:driver_id(full_name)')
      .eq('status', 'active')
      .limit(10)
    setActiveTrips(data || [])
  }

  async function fetchRevenue() {
    const { data: users } = await supabase
      .from('users')
      .select('subscription_tier, trial_ends_at')

    if (!users) return

    // Calculate MRR
    const tierCounts = {}
    let trialTotal = 0
    let trialConverted = 0
    users.forEach(u => {
      tierCounts[u.subscription_tier] = (tierCounts[u.subscription_tier] || 0) + 1
      // Count users who ever had a trial (have trial_ends_at set)
      if (u.trial_ends_at) {
        trialTotal++
        // If they are no longer on trial, they converted
        if (u.subscription_tier !== 'trial') {
          trialConverted++
        }
      }
    })

    const mrr = Object.entries(tierCounts).reduce((acc, [tier, count]) => {
      const price = SUBSCRIPTION_PRICES[tier]?.amount || 0
      return acc + price * count
    }, 0)

    setRevenueData({ mrr, trialTotal, trialConverted })
  }

  async function fetchAlerts() {
    const { data } = await supabase
      .from('trip_events')
      .select('*, trips(routes(name))')
      .in('event_type', ['sos', 'speed_alert', 'route_deviation'])
      .order('created_at', { ascending: false })
      .limit(10)
    setRecentAlerts(data || [])
  }

  const statCards = [
    { label: 'Active Parents', value: stats.parents, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Drivers', value: stats.drivers, icon: Car, color: 'text-green-600 bg-green-100' },
    { label: 'Children', value: stats.children, icon: Baby, color: 'text-purple-600 bg-purple-100' },
    { label: 'Live Trips', value: stats.activeTrips, icon: MapPin, color: 'text-amber-600 bg-amber-100' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-sm text-text-secondary">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue & Conversion */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-100">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">R{revenueData.mrr.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Estimated MRR</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 bg-indigo-100">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {revenueData.trialTotal > 0
                  ? `${Math.round((revenueData.trialConverted / revenueData.trialTotal) * 100)}%`
                  : '—'}
              </p>
              <p className="text-sm text-text-secondary">Trial Conversion Rate</p>
              <p className="text-xs text-text-secondary">{revenueData.trialConverted} of {revenueData.trialTotal} trial users</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active trips */}
        <Card>
          <CardTitle>Live Trips</CardTitle>
          {activeTrips.length === 0 ? (
            <p className="text-sm text-text-secondary mt-3">No active trips right now.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {activeTrips.map(trip => (
                <div key={trip.id} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{trip.routes?.name}</p>
                    <p className="text-xs text-text-secondary">Driver: {trip.drivers?.full_name}</p>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {trip.started_at && format(new Date(trip.started_at), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardTitle>Recent Alerts</CardTitle>
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-text-secondary mt-3">No recent alerts.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${
                    alert.event_type === 'sos' ? 'text-danger' : 'text-warning'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {alert.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-xs text-text-secondary">{alert.trips?.routes?.name}</p>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {alert.created_at && format(new Date(alert.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
