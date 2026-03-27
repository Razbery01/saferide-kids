import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { loadGoogleMaps, createMap, drawRoute, createPinMarker, fitBounds } from '../../lib/maps'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { Clock, MapPin, ChevronDown, ChevronUp, FileDown } from 'lucide-react'
import { exportTripPDF } from '../../lib/pdf'
import { format } from 'date-fns'

function TripRouteMap({ tripId, events }) {
  const mapRef = useRef(null)
  const [positions, setPositions] = useState([])
  const [mapError, setMapError] = useState(null)
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
    async function fetchPositions() {
      const { data } = await supabase
        .from('trip_positions')
        .select('lat, lng')
        .eq('trip_id', tripId)
        .order('recorded_at', { ascending: true })
      setPositions(data || [])
      setMapLoading(false)
    }
    fetchPositions()
  }, [tripId])

  useEffect(() => {
    if (mapLoading || !mapRef.current) return
    if (positions.length === 0) return

    let mounted = true

    async function initMap() {
      try {
        await loadGoogleMaps()
        if (!mounted || !mapRef.current) return

        const map = createMap(mapRef.current, { zoom: 13 })

        // Draw the GPS path as a polyline
        drawRoute(map, positions, '#0D9468')

        // Collect all points for fitting bounds
        const allPoints = [...positions]

        // Add event markers (pickup, dropoff, school)
        if (events && events.length > 0) {
          const eventColors = {
            child_picked_up: '#F59E0B',
            child_dropped_off: '#8B5CF6',
            at_school: '#3B82F6',
            trip_started: '#10B981',
            trip_ended: '#EF4444',
          }
          const eventLabels = {
            child_picked_up: 'Pickup',
            child_dropped_off: 'Dropoff',
            at_school: 'School',
            trip_started: 'Start',
            trip_ended: 'End',
          }

          events.forEach(event => {
            if (event.lat && event.lng) {
              const label = eventLabels[event.event_type] || event.event_type
              const color = eventColors[event.event_type] || '#6B7280'
              createPinMarker(map, { lat: event.lat, lng: event.lng }, label, color)
              allPoints.push({ lat: event.lat, lng: event.lng })
            }
          })
        }

        // Auto-fit to show the full route
        fitBounds(map, allPoints)
      } catch {
        if (mounted) setMapError('Unable to load map')
      }
    }

    initMap()
    return () => { mounted = false }
  }, [positions, mapLoading, events])

  if (mapLoading) {
    return <div className="h-[200px] bg-gray-100 rounded-xl flex items-center justify-center text-xs text-text-secondary">Loading map...</div>
  }

  if (positions.length === 0) {
    return <div className="h-[200px] bg-gray-100 rounded-xl flex items-center justify-center text-xs text-text-secondary">No GPS data recorded</div>
  }

  if (mapError) {
    return <div className="h-[200px] bg-gray-100 rounded-xl flex items-center justify-center text-xs text-text-secondary">{mapError}</div>
  }

  return <div ref={mapRef} className="h-[200px] rounded-xl overflow-hidden" />
}

export default function TripHistory() {
  const { profile } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTrip, setExpandedTrip] = useState(null)
  const [tripEvents, setTripEvents] = useState({})

  useEffect(() => {
    fetchTrips()
  }, [profile])

  async function fetchTrips() {
    if (!profile) return
    try {
      // Get children's route IDs
      const { data: children } = await supabase
        .from('children')
        .select('child_route_assignments(route_id)')
        .eq('parent_id', profile.id)

      const routeIds = (children || [])
        .flatMap(c => c.child_route_assignments?.map(a => a.route_id) || [])

      if (routeIds.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('trips')
        .select('*, routes(name, school_name), drivers:driver_id(full_name)')
        .in('route_id', routeIds)
        .order('started_at', { ascending: false })
        .limit(50)

      setTrips(data || [])
    } catch {
      // Trip fetch failed
    } finally {
      setLoading(false)
    }
  }

  async function toggleExpand(tripId) {
    if (expandedTrip === tripId) {
      setExpandedTrip(null)
      return
    }
    setExpandedTrip(tripId)

    if (!tripEvents[tripId]) {
      const { data } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
      setTripEvents(prev => ({ ...prev, [tripId]: data || [] }))
    }
  }

  if (loading) return <div className="py-8 text-center text-text-secondary">Loading trips...</div>

  if (trips.length === 0) {
    return <EmptyState icon={Clock} title="No trips yet" description="Trip history will appear here once your child's driver starts trips." />
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">Trip History</h2>

      {trips.map((trip) => (
        <Card key={trip.id} padding={false}>
          <button
            onClick={() => toggleExpand(trip.id)}
            className="w-full p-4 flex items-center gap-3 text-left"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              trip.trip_type === 'morning' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <MapPin className={`h-5 w-5 ${trip.trip_type === 'morning' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text-primary text-sm truncate">{trip.routes?.name || 'Trip'}</p>
                <Badge variant={trip.status === 'completed' ? 'success' : trip.status === 'active' ? 'warning' : 'neutral'}>
                  {trip.status}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {trip.started_at && format(new Date(trip.started_at), 'MMM d, yyyy • h:mm a')}
                {trip.ended_at && ` – ${format(new Date(trip.ended_at), 'h:mm a')}`}
              </p>
              <p className="text-xs text-text-secondary">Driver: {trip.drivers?.full_name || 'Unknown'}</p>
            </div>
            {expandedTrip === trip.id ? (
              <ChevronUp className="h-5 w-5 text-text-secondary shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-secondary shrink-0" />
            )}
          </button>

          {expandedTrip === trip.id && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              {/* Route map replay */}
              <div className="mb-3">
                <TripRouteMap tripId={trip.id} events={tripEvents[trip.id] || []} />
              </div>

              <p className="text-xs font-medium text-text-secondary mb-2">Events</p>
              {(tripEvents[trip.id] || []).length === 0 ? (
                <p className="text-xs text-text-secondary">No events recorded</p>
              ) : (
                <div className="space-y-2">
                  {tripEvents[trip.id].map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                      <span className="text-text-primary font-medium">
                        {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-text-secondary ml-auto">
                        {event.created_at && format(new Date(event.created_at), 'h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* PDF Export (Premium) */}
              {profile?.subscription_tier === 'parent_premium' && trip.status === 'completed' && (
                <button
                  onClick={() => exportTripPDF({ trip, events: tripEvents[trip.id] || [] })}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition"
                >
                  <FileDown className="h-3.5 w-3.5" /> Download Trip Summary (PDF)
                </button>
              )}
              {profile?.subscription_tier !== 'parent_premium' && trip.status === 'completed' && (
                <p className="mt-3 text-xs text-text-muted">PDF export available on Premium plan</p>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
