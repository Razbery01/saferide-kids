import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Play, Square, MapPin, Users, Clock, Copy, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function DriverDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [driverInfo, setDriverInfo] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [routes, setRoutes] = useState([])
  const [todayTrips, setTodayTrips] = useState([])
  const [codeCopied, setCodeCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showEndTrip, setShowEndTrip] = useState(false)
  const [notification, setNotification] = useState('')

  useEffect(() => {
    fetchDriverData()
  }, [profile])

  async function fetchDriverData() {
    if (!profile) return
    const { data: driver, error } = await supabase.from('drivers').select('*').eq('id', profile.id).single()

    if (error || !driver) {
      // No driver record — redirect to onboarding
      navigate('/driver/onboarding', { replace: true })
      return
    }
    setDriverInfo(driver)

    if (driver) {
      const { data: routeData } = await supabase
        .from('routes')
        .select('*, route_stops(*), child_route_assignments(children(full_name))')
        .eq('driver_id', driver.id)
        .eq('is_active', true)
      setRoutes(routeData || [])

      // Active trip
      const { data: tripData } = await supabase
        .from('trips')
        .select('*, routes(name)')
        .eq('driver_id', driver.id)
        .eq('status', 'active')
        .limit(1)
        .single()
      setActiveTrip(tripData)

      // Today's trips
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: todayData } = await supabase
        .from('trips')
        .select('*, routes(name)')
        .eq('driver_id', driver.id)
        .gte('started_at', todayStart.toISOString())
        .order('started_at', { ascending: false })
      setTodayTrips(todayData || [])
    }
  }

  async function handleStartTrip(routeId, tripType) {
    setStarting(true)
    try {
      const { data, error } = await supabase.from('trips').insert({
        driver_id: profile.id,
        route_id: routeId,
        trip_type: tripType,
        status: 'active',
        started_at: new Date().toISOString(),
      }).select('*, routes(name)').single()

      if (error) throw error

      // Create trip_started event
      await supabase.from('trip_events').insert({
        trip_id: data.id,
        event_type: 'trip_started',
      })

      setActiveTrip(data)
    } catch {
      setNotification('Failed to start trip. Please try again.')
    } finally {
      setStarting(false)
    }
  }

  async function handleEndTrip() {
    if (!activeTrip) return
    setShowEndTrip(true)
  }

  async function confirmEndTrip() {
    setShowEndTrip(false)

    await supabase.from('trips').update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    }).eq('id', activeTrip.id)

    await supabase.from('trip_events').insert({
      trip_id: activeTrip.id,
      event_type: 'trip_ended',
    })

    setActiveTrip(null)
    fetchDriverData()
  }

  function copyRouteCode() {
    navigator.clipboard.writeText(driverInfo?.route_code || '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const isPending = driverInfo?.verification_status === 'pending'

  return (
    <div className="space-y-4">
      {/* Verification banner */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
          <p className="font-semibold text-amber-800">Account Pending Approval</p>
          <p className="text-sm text-amber-600 mt-1">Your documents are being reviewed by KelyRa Tech.</p>
        </div>
      )}

      {/* Route code */}
      {driverInfo?.route_code && (
        <Card>
          <p className="text-sm text-text-secondary mb-1">Your Route Code</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary tracking-widest">{driverInfo.route_code}</span>
            <button onClick={copyRouteCode} className="p-2 rounded-lg hover:bg-gray-100 transition">
              {codeCopied ? <CheckCircle className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5 text-text-secondary" />}
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1">Share this code with parents to link their children to your route.</p>
        </Card>
      )}

      {/* Active trip */}
      {activeTrip ? (
        <Card className="bg-primary text-white border-primary">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-white/80">Active Trip</p>
              <p className="text-lg font-bold">{activeTrip.routes?.name}</p>
              <p className="text-sm text-white/80">
                Started: {activeTrip.started_at && format(new Date(activeTrip.started_at), 'h:mm a')}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2">
            <Link to="/driver/trip" className="flex-1">
              <Button variant="secondary" fullWidth size="lg">
                <MapPin className="h-5 w-5" /> Manage Trip
              </Button>
            </Link>
            <Button variant="danger" size="lg" onClick={handleEndTrip}>
              <Square className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Start a Trip</h2>
          {routes.length === 0 ? (
            <Card className="text-center py-6">
              <MapPin className="h-8 w-8 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No routes created yet</p>
              <Link to="/driver/routes" className="text-sm text-primary font-semibold mt-2 inline-block">
                Create a route
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {routes.map((route) => {
                const childCount = route.child_route_assignments?.length || 0
                return (
                  <Card key={route.id}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-text-primary">{route.name}</p>
                        <p className="text-xs text-text-secondary flex items-center gap-1">
                          <Users className="h-3 w-3" /> {childCount} children • {route.route_stops?.length || 0} stops
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        fullWidth
                        onClick={() => handleStartTrip(route.id, 'morning')}
                        loading={starting}
                        disabled={isPending}
                      >
                        <Play className="h-5 w-5" /> Morning Trip
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        fullWidth
                        onClick={() => handleStartTrip(route.id, 'afternoon')}
                        loading={starting}
                        disabled={isPending}
                      >
                        <Play className="h-5 w-5" /> Afternoon Trip
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Today's trips */}
      {todayTrips.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Today's Trips</h2>
          <div className="space-y-2">
            {todayTrips.filter(t => t.status !== 'active').map(trip => (
              <Card key={trip.id} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{trip.routes?.name}</p>
                  <p className="text-xs text-text-secondary">
                    {trip.trip_type} • {trip.started_at && format(new Date(trip.started_at), 'h:mm a')}
                    {trip.ended_at && ` – ${format(new Date(trip.ended_at), 'h:mm a')}`}
                  </p>
                </div>
                <Badge variant="success">Done</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* End Trip confirmation modal */}
      <Modal isOpen={showEndTrip} onClose={() => setShowEndTrip(false)} title="End Trip" size="sm">
        <p className="text-sm text-text-secondary mb-4">Are you sure you want to end this trip?</p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setShowEndTrip(false)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={confirmEndTrip}>End Trip</Button>
        </div>
      </Modal>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in">
          {notification}
          <button onClick={() => setNotification('')} className="ml-3 text-white/60 hover:text-white">✕</button>
        </div>
      )}
    </div>
  )
}
