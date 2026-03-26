import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import LiveMap from '../../components/maps/LiveMap'
import { MapPin } from 'lucide-react'
import { format } from 'date-fns'

export default function LiveTrips() {
  const [trips, setTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [latestPosition, setLatestPosition] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [schoolPos, setSchoolPos] = useState(null)

  useEffect(() => {
    fetchTrips()
    const interval = setInterval(fetchTrips, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTrips() {
    const { data } = await supabase
      .from('trips')
      .select('*, routes(name, school_name, school_lat, school_lng)')
      .eq('status', 'active')
      .order('started_at', { ascending: false })

    // Fetch driver names separately to avoid RLS join issues
    if (data?.length > 0) {
      const driverIds = data.map(t => t.driver_id)
      const { data: users } = await supabase.from('users').select('id, full_name').in('id', driverIds)
      const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))
      setTrips(data.map(t => ({ ...t, drivers: userMap[t.driver_id] || null })))
    } else {
      setTrips([])
    }
  }

  async function selectTrip(trip) {
    setSelectedTrip(trip)

    if (trip.routes?.school_lat && trip.routes?.school_lng) {
      setSchoolPos({ lat: trip.routes.school_lat, lng: trip.routes.school_lng })
    } else {
      setSchoolPos(null)
    }

    const { data: posData } = await supabase
      .from('trip_positions')
      .select('*')
      .eq('trip_id', trip.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()
    setLatestPosition(posData)

    const { data: allPos } = await supabase
      .from('trip_positions')
      .select('lat, lng')
      .eq('trip_id', trip.id)
      .order('recorded_at', { ascending: true })
    setBreadcrumbs(allPos || [])
  }

  const vehiclePos = latestPosition ? { lat: latestPosition.lat, lng: latestPosition.lng } : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">Live Trip Monitor</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          <p className="text-sm text-text-secondary font-medium">{trips.length} active trip{trips.length !== 1 ? 's' : ''}</p>
          {trips.map(trip => (
            <Card
              key={trip.id}
              hover
              className={`cursor-pointer ${selectedTrip?.id === trip.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => selectTrip(trip)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <p className="font-semibold text-sm">{trip.routes?.name}</p>
              </div>
              <p className="text-xs text-text-secondary">Driver: {trip.drivers?.full_name || 'Unknown'}</p>
              <p className="text-xs text-text-secondary mt-1">
                Started: {trip.started_at && format(new Date(trip.started_at), 'h:mm a')}
              </p>
            </Card>
          ))}
          {trips.length === 0 && (
            <Card className="text-center py-8">
              <MapPin className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No active trips</p>
            </Card>
          )}
        </div>

        <div className="col-span-2">
          {selectedTrip ? (
            <div className="space-y-4">
              <LiveMap
                vehiclePosition={vehiclePos}
                schoolPosition={schoolPos}
                breadcrumbs={breadcrumbs}
                height="500px"
              />
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedTrip.routes?.name}</p>
                    <p className="text-sm text-text-secondary">Driver: {selectedTrip.drivers?.full_name}</p>
                  </div>
                  {latestPosition && (
                    <Badge variant="info">{Math.round(latestPosition.speed_kmh || 0)} km/h</Badge>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">Select a trip to view on map</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
