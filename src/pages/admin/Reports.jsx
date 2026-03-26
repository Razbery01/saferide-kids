import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FileText, Download, Calendar } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function Reports() {
  const [tripReport, setTripReport] = useState([])
  const [dateRange, setDateRange] = useState('7')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReport() }, [dateRange])

  async function fetchReport() {
    setLoading(true)
    const since = subDays(new Date(), parseInt(dateRange)).toISOString()

    const { data } = await supabase
      .from('trips')
      .select('*, routes(name), drivers:driver_id(full_name)')
      .gte('started_at', since)
      .order('started_at', { ascending: false })

    setTripReport(data || [])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <Button onClick={exportCSV} disabled={tripReport.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-2">
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

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">Total Trips</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{tripReport.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Completed</p>
          <p className="text-2xl font-bold text-success mt-1">{tripReport.filter(t => t.status === 'completed').length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Cancelled</p>
          <p className="text-2xl font-bold text-danger mt-1">{tripReport.filter(t => t.status === 'cancelled').length}</p>
        </Card>
      </div>

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
                    <td className="px-4 py-3 text-sm">
                      {trip.started_at && format(new Date(trip.started_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{trip.routes?.name}</td>
                    <td className="px-4 py-3 text-sm">{trip.drivers?.full_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={trip.trip_type === 'morning' ? 'warning' : 'info'}>{trip.trip_type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={trip.status === 'completed' ? 'success' : trip.status === 'active' ? 'warning' : 'danger'}>
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {duration ? `${duration} min` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {tripReport.length === 0 && (
          <div className="py-8 text-center text-text-secondary text-sm">No trips in this period</div>
        )}
      </Card>
    </div>
  )
}
