import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { Download, Printer, AlertTriangle, Users } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function Reports() {
  const [tripReport, setTripReport] = useState([])
  const [incidents, setIncidents] = useState([])
  const [userGrowth, setUserGrowth] = useState([])
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [dateRange])

  async function fetchAll() {
    setLoading(true)
    const since = subDays(new Date(), parseInt(dateRange)).toISOString()

    const [tripRes, eventRes, userRes] = await Promise.all([
      supabase.from('trips')
        .select('*, routes(name), drivers:driver_id(full_name)')
        .gte('started_at', since)
        .order('started_at', { ascending: false }),
      supabase.from('trip_events')
        .select('event_type, created_at')
        .in('event_type', ['incident', 'sos', 'speed_alert', 'route_deviation'])
        .gte('created_at', since),
      supabase.from('users')
        .select('created_at')
        .order('created_at', { ascending: true }),
    ])

    setTripReport(tripRes.data || [])
    setIncidents(eventRes.data || [])

    const months = {}
    ;(userRes.data || []).forEach(u => {
      const month = format(new Date(u.created_at), 'MMM yyyy')
      months[month] = (months[month] || 0) + 1
    })
    setUserGrowth(Object.entries(months).map(([month, count]) => ({ month, count })))
    setLoading(false)
  }

  function exportCSV() {
    const headers = ['Date', 'Route', 'Driver', 'Type', 'Status', 'Started', 'Ended']
    const rows = tripReport.map(t => [
      t.started_at ? format(new Date(t.started_at), 'yyyy-MM-dd') : '',
      t.routes?.name || '',
      t.drivers?.full_name || '',
      t.trip_type,
      t.status,
      t.started_at ? format(new Date(t.started_at), 'HH:mm') : '',
      t.ended_at ? format(new Date(t.ended_at), 'HH:mm') : '',
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const incidentCounts = {}
  incidents.forEach(e => { incidentCounts[e.event_type] = (incidentCounts[e.event_type] || 0) + 1 })

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
          <Button onClick={exportCSV} disabled={tripReport.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">SafeRide Kids — Report</h1>
        <p className="text-sm text-gray-500">Generated {format(new Date(), 'MMMM d, yyyy')} &middot; Last {dateRange} days</p>
      </div>

      <div className="flex gap-2 print:hidden">
        {[
          { value: '7', label: 'Last 7 days' },
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDateRange(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              dateRange === value ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Trip stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-sm text-text-secondary">Total Trips</p><p className="text-2xl font-bold text-text-primary mt-1">{tripReport.length}</p></Card>
        <Card><p className="text-sm text-text-secondary">Completed</p><p className="text-2xl font-bold text-success mt-1">{tripReport.filter(t => t.status === 'completed').length}</p></Card>
        <Card><p className="text-sm text-text-secondary">Cancelled</p><p className="text-2xl font-bold text-danger mt-1">{tripReport.filter(t => t.status === 'cancelled').length}</p></Card>
      </div>

      {/* Incident Summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-danger" />
          <h2 className="text-[15px] font-bold text-text-primary">Incident Summary</h2>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-text-secondary">No incidents in this period.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {[
              { type: 'incident', label: 'Incidents', color: 'text-danger' },
              { type: 'sos', label: 'SOS Alerts', color: 'text-red-600' },
              { type: 'speed_alert', label: 'Speed Alerts', color: 'text-orange-600' },
              { type: 'route_deviation', label: 'Route Deviations', color: 'text-amber-600' },
            ].map(item => (
              <div key={item.type} className="bg-background rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{incidentCounts[item.type] || 0}</p>
                <p className="text-xs text-text-secondary mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* User Growth */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-[15px] font-bold text-text-primary">User Growth</h2>
        </div>
        {userGrowth.length === 0 ? (
          <p className="text-sm text-text-secondary">No registration data.</p>
        ) : (
          <div className="space-y-2">
            {userGrowth.slice(-6).map(({ month, count }) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-sm text-text-secondary w-20">{month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, (count / Math.max(...userGrowth.map(g => g.count))) * 100)}%`, minWidth: '2rem' }}
                  >
                    <span className="text-[10px] font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Trip table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Duration</th>
              </tr>
            </thead>
            <tbody>
              {tripReport.map(trip => {
                const duration = trip.started_at && trip.ended_at
                  ? Math.round((new Date(trip.ended_at) - new Date(trip.started_at)) / 60000)
                  : null
                return (
                  <tr key={trip.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{trip.started_at && format(new Date(trip.started_at), 'MMM d, h:mm a')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{trip.routes?.name}</td>
                    <td className="px-4 py-3 text-sm">{trip.drivers?.full_name}</td>
                    <td className="px-4 py-3"><Badge variant={trip.trip_type === 'morning' ? 'warning' : 'info'}>{trip.trip_type}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={trip.status === 'completed' ? 'success' : trip.status === 'active' ? 'warning' : 'danger'}>{trip.status}</Badge></td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{duration ? `${duration} min` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {tripReport.length === 0 && <div className="py-8 text-center text-text-secondary text-sm">No trips in this period</div>}
      </Card>
    </div>
  )
}
