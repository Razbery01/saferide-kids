import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { Square, CheckCircle, XCircle, Phone, Gauge, AlertTriangle, Send } from 'lucide-react'
import { format } from 'date-fns'
import { GPS_UPDATE_INTERVAL, EVENT_TYPES } from '../../lib/constants'

export default function ActiveTrip() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [children, setChildren] = useState([])
  const [childStatus, setChildStatus] = useState({})
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showIncident, setShowIncident] = useState(false)
  const gpsIntervalRef = useRef(null)

  useEffect(() => {
    fetchActiveTrip()
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current)
    }
  }, [profile])

  async function fetchActiveTrip() {
    if (!profile) return
    const { data } = await supabase
      .from('trips')
      .select('*, routes(*, route_stops(*), child_route_assignments(*, children(full_name, school_name)))')
      .eq('driver_id', profile.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (!data) { navigate('/driver'); return }
    setTrip(data)

    const kids = data.routes?.child_route_assignments?.map(a => ({
      ...a.children,
      assignment_id: a.id,
      stop_id: a.stop_id,
    })) || []
    setChildren(kids)

    // Start GPS broadcasting
    startGPSBroadcast(data.id)
  }

  function startGPSBroadcast(tripId) {
    if (!navigator.geolocation) return

    function sendPosition() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const speed = (pos.coords.speed || 0) * 3.6 // m/s to km/h
          setCurrentSpeed(Math.round(speed))

          await supabase.from('trip_positions').insert({
            trip_id: tripId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed_kmh: Math.round(speed),
            recorded_at: new Date().toISOString(),
          })
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }

    sendPosition()
    gpsIntervalRef.current = setInterval(sendPosition, GPS_UPDATE_INTERVAL)
  }

  async function handleChildAction(child, action) {
    if (!trip) return

    const eventType = action === 'picked_up' ? EVENT_TYPES.CHILD_PICKED_UP : EVENT_TYPES.CHILD_DROPPED_OFF

    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      child_id: child.id,
      event_type: eventType,
    })

    setChildStatus(prev => ({ ...prev, [child.id]: action }))
  }

  async function handleAtSchool() {
    if (!trip) return
    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event_type: EVENT_TYPES.AT_SCHOOL,
    })
    alert('All parents notified of arrival at school.')
  }

  async function handleEndTrip() {
    if (!trip || !confirm('End this trip?')) return

    clearInterval(gpsIntervalRef.current)

    await supabase.from('trips').update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    }).eq('id', trip.id)

    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event_type: EVENT_TYPES.TRIP_ENDED,
    })

    navigate('/driver')
  }

  async function handleBroadcast(e) {
    e.preventDefault()
    if (!broadcastMsg.trim() || !trip) return

    // Get all parent IDs linked to this route
    const { data: assignments } = await supabase
      .from('child_route_assignments')
      .select('children(parent_id)')
      .eq('route_id', trip.route_id)

    const parentIds = [...new Set(assignments?.map(a => a.children?.parent_id).filter(Boolean) || [])]

    // Send broadcast message to each parent
    for (const parentId of parentIds) {
      await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: parentId,
        content: broadcastMsg.trim(),
        is_broadcast: true,
      })
    }

    setBroadcastMsg('')
    setShowBroadcast(false)
    alert('Broadcast sent to all parents.')
  }

  async function handleReportIncident(type) {
    if (!trip) return
    await supabase.from('trip_events').insert({
      trip_id: trip.id,
      event_type: 'incident',
      notes: type,
    })
    setShowIncident(false)
    alert('Incident reported to Admin.')
  }

  if (!trip) return <div className="py-8 text-center text-text-secondary">Loading trip...</div>

  const quickMessages = ['Running 10 minutes late', 'Traffic on route', 'Arrived at stop — please send child out']

  return (
    <div className="space-y-4">
      {/* Trip header */}
      <Card className="bg-primary text-white border-primary">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">{trip.trip_type === 'morning' ? 'Morning' : 'Afternoon'} Trip</p>
            <p className="text-lg font-bold">{trip.routes?.name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Gauge className="h-4 w-4" />
              <span className="text-2xl font-bold">{currentSpeed}</span>
              <span className="text-sm text-white/80">km/h</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Child manifest */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Children</h2>
        <div className="space-y-2">
          {children.map((child) => {
            const status = childStatus[child.id]
            return (
              <Card key={child.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                  {child.full_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{child.full_name}</p>
                  <p className="text-xs text-text-secondary">{child.school_name}</p>
                </div>
                {status ? (
                  <Badge variant={status === 'picked_up' ? 'success' : status === 'absent' ? 'danger' : 'warning'}>
                    {status === 'picked_up' ? 'On Board' : status === 'dropped_off' ? 'Dropped Off' : 'Absent'}
                  </Badge>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleChildAction(child, 'picked_up')}
                      className="p-2 bg-green-100 rounded-lg text-green-700 hover:bg-green-200 transition"
                      title="Picked Up"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setChildStatus(prev => ({ ...prev, [child.id]: 'absent' }))}
                      className="p-2 bg-red-100 rounded-lg text-red-700 hover:bg-red-200 transition"
                      title="Absent"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" fullWidth onClick={handleAtSchool}>
          Arrived at School
        </Button>
        <Button variant="outline" size="lg" fullWidth onClick={() => setShowBroadcast(true)}>
          <Send className="h-4 w-4" /> Broadcast
        </Button>
      </div>

      <Button variant="outline" fullWidth onClick={() => setShowIncident(true)}>
        <AlertTriangle className="h-4 w-4" /> Report Incident
      </Button>

      <Button variant="danger" size="lg" fullWidth onClick={handleEndTrip}>
        <Square className="h-5 w-5" /> End Trip
      </Button>

      {/* Broadcast modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBroadcast(false)} />
          <div className="relative bg-surface rounded-t-2xl w-full max-w-lg p-5">
            <h3 className="font-semibold text-text-primary mb-3">Broadcast to Parents</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickMessages.map((msg) => (
                <button
                  key={msg}
                  onClick={() => setBroadcastMsg(msg)}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-text-primary hover:bg-gray-200 transition"
                >
                  {msg}
                </button>
              ))}
            </div>
            <form onSubmit={handleBroadcast} className="flex gap-2">
              <input
                type="text"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Custom message..."
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>
      )}

      {/* Incident modal */}
      {showIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowIncident(false)} />
          <div className="relative bg-surface rounded-2xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-text-primary mb-3">Report Incident</h3>
            <div className="space-y-2">
              {['Vehicle breakdown', 'Accident', 'Route change', 'Child not at stop'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleReportIncident(type)}
                  className="w-full text-left p-3 rounded-xl border border-border hover:bg-gray-50 transition text-sm font-medium text-text-primary"
                >
                  {type}
                </button>
              ))}
            </div>
            <Button variant="ghost" fullWidth onClick={() => setShowIncident(false)} className="mt-3">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
