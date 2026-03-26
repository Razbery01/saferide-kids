import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Input from '../../components/ui/Input'
import { Clock, MapPin } from 'lucide-react'
import { format, subDays } from 'date-fns'

export default function DriverTrips() {
  const { profile } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    supabase
      .from('trips')
      .select('*, routes(name)')
      .eq('driver_id', profile.id)
      .gte('started_at', new Date(fromDate).toISOString())
      .lte('started_at', new Date(toDate + 'T23:59:59').toISOString())
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setTrips(data || []); setLoading(false) })
  }, [profile, fromDate, toDate])

  if (loading) return <div className="py-8 text-center text-text-secondary">Loading...</div>

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">Trip Log</h2>

      {/* Date range filter */}
      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="From"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="To"
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-2">
          Showing <span className="font-semibold text-text-primary">{trips.length}</span> trip{trips.length !== 1 ? 's' : ''} in selected range
        </p>
      </Card>

      {trips.length === 0 ? (
        <EmptyState icon={Clock} title="No trips found" description="No trips match the selected date range." />
      ) : trips.map(trip => (
        <Card key={trip.id} className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            trip.trip_type === 'morning' ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            <MapPin className={`h-5 w-5 ${trip.trip_type === 'morning' ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-text-primary">{trip.routes?.name}</p>
            <p className="text-xs text-text-secondary">
              {trip.trip_type} • {trip.started_at && format(new Date(trip.started_at), 'MMM d, h:mm a')}
              {trip.ended_at && ` – ${format(new Date(trip.ended_at), 'h:mm a')}`}
            </p>
          </div>
          <Badge variant={trip.status === 'completed' ? 'success' : trip.status === 'active' ? 'warning' : 'neutral'}>
            {trip.status}
          </Badge>
        </Card>
      ))}
      </div>
  )
}
