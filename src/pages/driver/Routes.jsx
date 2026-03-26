import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import AddressSearch from '../../components/ui/AddressSearch'
import { MapPin, Plus, Trash2, Users, Clock, Sun, Sunrise } from 'lucide-react'

export default function DriverRoutes() {
  const { profile } = useAuth()
  const [routes, setRoutes] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showAddStop, setShowAddStop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routeForm, setRouteForm] = useState({ name: '', school_name: '', school_address: '', school_lat: null, school_lng: null, schedule: 'both' })
  const [stopForm, setStopForm] = useState({ address: '', lat: null, lng: null })
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  const handleSchoolLocation = useCallback((place) => {
    setRouteForm(f => ({
      ...f,
      school_address: place.address,
      school_lat: place.lat,
      school_lng: place.lng,
    }))
  }, [])

  const handleStopLocation = useCallback((place) => {
    setStopForm({
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    })
  }, [])

  async function handleCreateRoute(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error: insertErr } = await supabase.from('routes').insert({
        driver_id: profile.id,
        name: routeForm.name,
        school_name: routeForm.school_name,
        school_lat: routeForm.school_lat,
        school_lng: routeForm.school_lng,
        schedule: routeForm.schedule,
        is_active: true,
      })
      if (insertErr) throw insertErr
      setShowCreate(false)
      setRouteForm({ name: '', school_name: '', school_address: '', school_lat: null, school_lng: null, schedule: 'both' })
      fetchRoutes()
    } catch (err) {
      setError(err.message?.includes('violates') ? 'Failed to create route. Please try again.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddStop(e) {
    e.preventDefault()
    if (!stopForm.address.trim()) return
    setSaving(true)
    setError('')
    try {
      const route = routes.find(r => r.id === showAddStop)
      const stopOrder = (route?.route_stops?.length || 0) + 1

      const { error: insertErr } = await supabase.from('route_stops').insert({
        route_id: showAddStop,
        address: stopForm.address,
        lat: stopForm.lat,
        lng: stopForm.lng,
        stop_order: stopOrder,
      })
      if (insertErr) throw insertErr
      setShowAddStop(null)
      setStopForm({ address: '', lat: null, lng: null })
      fetchRoutes()
    } catch (err) {
      setError(err.message?.includes('violates') ? 'Failed to add stop. Please try again.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.type === 'route') {
      await supabase.from('route_stops').delete().eq('route_id', deleteTarget.id)
      await supabase.from('child_route_assignments').delete().eq('route_id', deleteTarget.id)
      await supabase.from('routes').delete().eq('id', deleteTarget.id)
    } else {
      await supabase.from('route_stops').delete().eq('id', deleteTarget.id)
    }
    setDeleteTarget(null)
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
                <Badge variant={route.schedule === 'morning' ? 'warning' : route.schedule === 'afternoon' ? 'info' : 'accent'}>
                  {route.schedule === 'morning' ? 'AM' : route.schedule === 'afternoon' ? 'PM' : 'AM & PM'}
                </Badge>
                <Badge variant="primary">
                  <Users className="h-3 w-3 mr-1" />
                  {route.child_route_assignments?.length || 0} kids
                </Badge>
                <button onClick={() => setDeleteTarget({ type: 'route', id: route.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition">
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
                    <button onClick={() => setDeleteTarget({ type: 'stop', id: stop.id })} className="p-1 hover:bg-red-50 rounded text-text-secondary hover:text-danger">
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
          <AddressSearch
            label="School Location"
            placeholder="Search for school address..."
            value={{ address: routeForm.school_address }}
            onChange={handleSchoolLocation}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary tracking-tight">Trip Schedule</label>
            <select
              value={routeForm.schedule}
              onChange={e => setRouteForm(f => ({...f, schedule: e.target.value}))}
              className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300"
            >
              <option value="morning">Morning only</option>
              <option value="afternoon">Afternoon only</option>
              <option value="both">Both (morning &amp; afternoon)</option>
            </select>
          </div>
          <Button type="submit" fullWidth loading={saving}>Create Route</Button>
        </form>
      </Modal>

      {/* Add stop modal */}
      <Modal isOpen={!!showAddStop} onClose={() => setShowAddStop(null)} title="Add Pickup Stop">
        <form onSubmit={handleAddStop} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <AddressSearch
            label="Pickup Address"
            placeholder="Search for pickup address..."
            value={{ address: stopForm.address }}
            onChange={handleStopLocation}
            required
          />
          <Button type="submit" fullWidth loading={saving}>Add Stop</Button>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={deleteTarget?.type === 'route' ? 'Delete Route' : 'Remove Stop'} size="sm">
        <p className="text-sm text-text-secondary mb-4">
          {deleteTarget?.type === 'route'
            ? 'Delete this route and all its stops? Children linked to this route will be unlinked.'
            : 'Remove this stop from the route?'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
