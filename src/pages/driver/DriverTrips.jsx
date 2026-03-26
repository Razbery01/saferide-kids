import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'

export default function DriverTrips() {
  const { profile } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('trips')
      .select('*, routes(name)')
      .eq('driver_id', profile.id)
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setTrips(data || []); setLoading(false) })
  }, [profile])

  if (loading) return <div className="py-8 text-center text-text-secondary">Loading...</div>

  if (trips.length === 0) return <EmptyState icon={Clock} title="No trips yet" description="Your trip log will appear here." />

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">Trip Log</h2>
      {trips.map(trip => (
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
