import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Shield, Gauge, AlertTriangle, Navigation } from 'lucide-react'
import { format } from 'date-fns'

export default function SafetyReports() {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEvents() }, [filter])

  async function fetchEvents() {
    setLoading(true)
    let query = supabase
      .from('trip_events')
      .select('*, trips(routes(name), drivers:driver_id(full_name))')
      .in('event_type', ['sos', 'speed_alert', 'route_deviation'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('event_type', filter)

    const { data } = await query
    setEvents(data || [])
    setLoading(false)
  }

  const eventConfig = {
    sos: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-red-100', badge: 'danger', label: 'SOS' },
    speed_alert: { icon: Gauge, color: 'text-amber-600', bg: 'bg-amber-100', badge: 'warning', label: 'Speed Alert' },
    route_deviation: { icon: Navigation, color: 'text-blue-600', bg: 'bg-blue-100', badge: 'info', label: 'Route Deviation' },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Safety & Driver Behaviour</h1>

      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Events' },
          { key: 'sos', label: 'SOS' },
          { key: 'speed_alert', label: 'Speed Alerts' },
          { key: 'route_deviation', label: 'Route Deviations' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Notes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => {
                const config = eventConfig[event.event_type] || eventConfig.sos
                const Icon = config.icon
                return (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <Badge variant={config.badge}>{config.label}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{event.trips?.drivers?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{event.trips?.routes?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono">
                      {event.lat && event.lng ? `${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{event.notes || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {event.created_at && format(new Date(event.created_at), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {events.length === 0 && (
          <div className="py-8 text-center text-text-secondary text-sm">
            <Shield className="h-8 w-8 mx-auto mb-2 text-text-secondary/30" />
            No safety events found
          </div>
        )}
      </Card>
    </div>
  )
}
