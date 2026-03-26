import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import LiveMap from '../../components/maps/LiveMap'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { AlertTriangle, Gauge, Navigation } from 'lucide-react'
import { format } from 'date-fns'

export default function LiveTracking() {
  const { profile } = useAuth()
  const [activeTrip, setActiveTrip] = useState(null)
  const [latestPosition, setLatestPosition] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [events, setEvents] = useState([])
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [showSOS, setShowSOS] = useState(false)
  const [schoolPos, setSchoolPos] = useState(null)

  useEffect(() => { fetchChildren() }, [profile])

  useEffect(() => {
    if (!activeTrip) return

    const channel = supabase
      .channel(`trip-positions-${activeTrip.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_positions', filter: `trip_id=eq.${activeTrip.id}` },
        (payload) => {
          const pos = payload.new
          setLatestPosition(pos)
          setBreadcrumbs(prev => [...prev, { lat: pos.lat, lng: pos.lng }])
        })
      .subscribe()

    const eventChannel = supabase
      .channel(`trip-events-${activeTrip.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_events', filter: `trip_id=eq.${activeTrip.id}` },
        (payload) => setEvents(prev => [payload.new, ...prev]))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(eventChannel)
    }
  }, [activeTrip])

  async function fetchChildren() {
    if (!profile) return
    const { data } = await supabase
      .from('children')
      .select('*, child_route_assignments(route_id)')
      .eq('parent_id', profile.id)

    setChildren(data || [])
    if (data?.length > 0) {
      setSelectedChild(data[0])
      fetchActiveTrip(data[0])
    }
  }

  async function fetchActiveTrip(child) {
    const routeIds = child.child_route_assignments?.map(a => a.route_id) || []
    if (routeIds.length === 0) return

    const { data } = await supabase
      .from('trips')
      .select('*, routes(name, school_name, school_lat, school_lng)')
      .in('route_id', routeIds)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (data) {
      setActiveTrip(data)
      if (data.routes?.school_lat && data.routes?.school_lng) {
        setSchoolPos({ lat: data.routes.school_lat, lng: data.routes.school_lng })
      }

      const { data: posData } = await supabase
        .from('trip_positions')
        .select('*')
        .eq('trip_id', data.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()
      if (posData) {
        setLatestPosition(posData)
        setBreadcrumbs([{ lat: posData.lat, lng: posData.lng }])
      }

      // Load full breadcrumb trail
      const { data: allPos } = await supabase
        .from('trip_positions')
        .select('lat, lng')
        .eq('trip_id', data.id)
        .order('recorded_at', { ascending: true })
      if (allPos) setBreadcrumbs(allPos)

      const { data: eventData } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', data.id)
        .order('created_at', { ascending: false })
      setEvents(eventData || [])
    }
  }

  async function handleSOS() {
    if (!activeTrip) return
    await supabase.from('trip_events').insert({
      trip_id: activeTrip.id,
      child_id: selectedChild?.id,
      event_type: 'sos',
      lat: latestPosition?.lat,
      lng: latestPosition?.lng,
      notes: 'SOS triggered by parent',
    })
    setShowSOS(false)
    alert('SOS alert sent to your emergency contacts.')
  }

  const vehiclePos = latestPosition ? { lat: latestPosition.lat, lng: latestPosition.lng } : null

  return (
    <div className="space-y-4">
      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => { setSelectedChild(child); fetchActiveTrip(child) }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedChild?.id === child.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {child.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <Card padding={false} className="overflow-hidden relative">
        <LiveMap
          vehiclePosition={vehiclePos}
          schoolPosition={schoolPos}
          breadcrumbs={breadcrumbs}
          height="300px"
        />
        {latestPosition?.speed_kmh != null && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Gauge className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-bold">{Math.round(latestPosition.speed_kmh)} km/h</span>
          </div>
        )}
        {!activeTrip && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
            <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
              <Navigation className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="font-semibold text-text-primary">No active trip</p>
              <p className="text-sm text-text-secondary mt-1">The map will update when a trip starts</p>
            </div>
          </div>
        )}
      </Card>

      {/* Trip events */}
      {events.length > 0 && (
        <Card>
          <h3 className="font-semibold text-text-primary mb-3 text-sm">Trip Events</h3>
          <div className="space-y-3">
            {events.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-text-primary font-medium">
                    {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-text-muted text-xs">{event.created_at && format(new Date(event.created_at), 'h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SOS */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <Button variant="danger" size="xl" fullWidth onClick={() => setShowSOS(true)} className="shadow-lg">
          <AlertTriangle className="h-5 w-5" /> SOS Emergency
        </Button>
      </div>

      {showSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSOS(false)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Send SOS Alert?</h3>
            <p className="text-sm text-text-secondary mb-6">This will alert your emergency contacts and log an emergency event.</p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setShowSOS(false)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleSOS}>Send SOS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
