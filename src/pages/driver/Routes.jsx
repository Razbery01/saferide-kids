import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { MapPin, Plus, Trash2, GripVertical, Users } from 'lucide-react'

export default function DriverRoutes() {
  const { profile } = useAuth()
  const [routes, setRoutes] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showAddStop, setShowAddStop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routeForm, setRouteForm] = useState({ name: '', school_name: '', school_lat: '', school_lng: '' })
  const [stopForm, setStopForm] = useState({ address: '', lat: '', lng: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchRoutes() }, [profile])

  async function fetchRoutes() {
    if (!profile) return
    const { data } = await supabase
      .from('routes')
      .select('*, route_stops(*, child_route_assignments(children(full_name))), child_route_assignments(children(full_name))')
      .eq('driver_id', profile.id)
      .order('created_at', { ascending: false })
    setRoutes(data || [])
    setLoading(false)
  }

  async function handleCreateRoute(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.from('routes').insert({
        driver_id: profile.id,
        name: routeForm.name,
        school_name: routeForm.school_name,
        school_lat: routeForm.school_lat ? parseFloat(routeForm.school_lat) : null,
        school_lng: routeForm.school_lng ? parseFloat(routeForm.school_lng) : null,
        is_active: true,
      })
      if (error) throw error
      setShowCreate(false)
      setRouteForm({ name: '', school_name: '', school_lat: '', school_lng: '' })
      fetchRoutes()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddStop(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const route = routes.find(r => r.id === showAddStop)
      const stopOrder = (route?.route_stops?.length || 0) + 1

      const { error } = await supabase.from('route_stops').insert({
        route_id: showAddStop,
        address: stopForm.address,
        lat: stopForm.lat ? parseFloat(stopForm.lat) : null,
        lng: stopForm.lng ? parseFloat(stopForm.lng) : null,
        stop_order: stopOrder,
      })
      if (error) throw error
      setShowAddStop(null)
      setStopForm({ address: '', lat: '', lng: '' })
      fetchRoutes()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRoute(routeId) {
    if (!confirm('Delete this route and all its stops?')) return
    await supabase.from('route_stops').delete().eq('route_id', routeId)
    await supabase.from('child_route_assignments').delete().eq('route_id', routeId)
    await supabase.from('routes').delete().eq('id', routeId)
    fetchRoutes()
  }

  async function handleDeleteStop(stopId) {
    if (!confirm('Remove this stop?')) return
    await supabase.from('route_stops').delete().eq('id', stopId)
    fetchRoutes()
  }

  if (loading) return <div className="py-8 text-center text-text-secondary">Loading routes...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">My Routes</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Route
        </Button>
      </div>

      {routes.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No routes yet"
          description="Create your first route to start accepting children and running trips."
          action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create Route</Button>}
        />
      ) : (
        routes.map((route) => (
          <Card key={route.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-text-primary">{route.name}</p>
                <p className="text-xs text-text-secondary">{route.school_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="primary">
                  <Users className="h-3 w-3 mr-1" />
                  {route.child_route_assignments?.length || 0} kids
                </Badge>
                <button onClick={() => handleDeleteRoute(route.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stops */}
            <div className="space-y-2 mb-3">
              {(route.route_stops || [])
                .sort((a, b) => a.stop_order - b.stop_order)
                .map((stop, idx) => (
                  <div key={stop.id} className="flex items-center gap-2 p-2 bg-background rounded-lg text-sm">
                    <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-text-primary">{stop.address}</span>
                    <button onClick={() => handleDeleteStop(stop.id)} className="p-1 hover:bg-red-50 rounded text-text-secondary hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>

            <Button variant="ghost" size="sm" onClick={() => setShowAddStop(route.id)}>
              <Plus className="h-4 w-4" /> Add Stop
            </Button>
          </Card>
        ))
      )}

      {/* Create route modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Route">
        <form onSubmit={handleCreateRoute} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input label="Route Name" placeholder="e.g. Morning Route — Westville" value={routeForm.name} onChange={e => setRouteForm(f => ({...f, name: e.target.value}))} required />
          <Input label="School Name" placeholder="e.g. Westville Primary" value={routeForm.school_name} onChange={e => setRouteForm(f => ({...f, school_name: e.target.value}))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="School Lat" type="number" step="any" placeholder="-29.8" value={routeForm.school_lat} onChange={e => setRouteForm(f => ({...f, school_lat: e.target.value}))} />
            <Input label="School Lng" type="number" step="any" placeholder="31.0" value={routeForm.school_lng} onChange={e => setRouteForm(f => ({...f, school_lng: e.target.value}))} />
          </div>
          <Button type="submit" fullWidth loading={saving}>Create Route</Button>
        </form>
      </Modal>

      {/* Add stop modal */}
      <Modal isOpen={!!showAddStop} onClose={() => setShowAddStop(null)} title="Add Pickup Stop">
        <form onSubmit={handleAddStop} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input label="Address" placeholder="123 Main St, Westville" value={stopForm.address} onChange={e => setStopForm(f => ({...f, address: e.target.value}))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" value={stopForm.lat} onChange={e => setStopForm(f => ({...f, lat: e.target.value}))} />
            <Input label="Longitude" type="number" step="any" value={stopForm.lng} onChange={e => setStopForm(f => ({...f, lng: e.target.value}))} />
          </div>
          <Button type="submit" fullWidth loading={saving}>Add Stop</Button>
        </form>
      </Modal>
    </div>
  )
}
