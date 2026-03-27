import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { Baby, MapPin, Search, RefreshCw, Users } from 'lucide-react'

export default function ChildRouteManagement() {
  const [activeTab, setActiveTab] = useState('children')
  const [children, setChildren] = useState([])
  const [routes, setRoutes] = useState([])
  const [allRoutes, setAllRoutes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [reassignChild, setReassignChild] = useState(null)
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [reassigning, setReassigning] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [childrenRes, routesRes] = await Promise.all([
      supabase
        .from('children')
        .select('*, parent:parent_id(full_name), child_route_assignments(*, routes(name, schedule, driver_id, drivers:driver_id(full_name)))')
        .order('full_name'),
      supabase
        .from('routes')
        .select('*, route_stops(*), child_route_assignments(children(full_name)), drivers:driver_id(full_name)')
        .order('name'),
    ])
    setChildren(childrenRes.data || [])
    setRoutes(routesRes.data || [])
    setAllRoutes(routesRes.data || [])
    setLoading(false)
  }

  const filteredChildren = children.filter(child => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      child.full_name?.toLowerCase().includes(q) ||
      child.school?.toLowerCase().includes(q)
    )
  })

  const filteredRoutes = routes.filter(route => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      route.name?.toLowerCase().includes(q) ||
      route.school_name?.toLowerCase().includes(q) ||
      route.drivers?.full_name?.toLowerCase().includes(q)
    )
  })

  function getChildAssignment(child) {
    const active = child.child_route_assignments?.find(a => a.is_active !== false)
    return active || null
  }

  async function handleReassign() {
    if (!reassignChild || !selectedRouteId) return
    setReassigning(true)
    try {
      // Deactivate existing active assignments
      await supabase
        .from('child_route_assignments')
        .update({ is_active: false })
        .eq('child_id', reassignChild.id)
        .eq('is_active', true)

      // Create new assignment
      const { error } = await supabase.from('child_route_assignments').insert({
        child_id: reassignChild.id,
        route_id: selectedRouteId,
        is_active: true,
      })
      if (error) throw error

      setReassignChild(null)
      setSelectedRouteId('')
      fetchData()
    } catch {
      // Reassignment failed silently — fetchData will show current state
    } finally {
      setReassigning(false)
    }
  }

  if (loading) return <div className="py-8 text-center text-text-secondary">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Children & Routes</h1>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('children')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'children' ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          <Baby className="h-4 w-4 inline mr-1.5" />
          Children
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'routes' ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          <MapPin className="h-4 w-4 inline mr-1.5" />
          View Routes
        </button>
      </div>

      {/* Search */}
      <Input
        icon={Search}
        placeholder={activeTab === 'children' ? 'Search by child name or school...' : 'Search by route, school, or driver...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {activeTab === 'children' ? (
        /* Children table */
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Child</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">School</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Grade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map(child => {
                  const assignment = getChildAssignment(child)
                  const route = assignment?.routes
                  const driver = route?.drivers
                  return (
                    <tr key={child.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{child.full_name}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{child.parent?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{child.school || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{child.grade || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{driver?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {route ? <Badge variant="primary">{route.name}</Badge> : <Badge variant="neutral">Unassigned</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => { setReassignChild(child); setSelectedRouteId(assignment?.route_id || '') }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Reassign
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredChildren.length === 0 && (
            <div className="py-8 text-center text-text-secondary text-sm">No children found</div>
          )}
        </Card>
      ) : (
        /* Routes view */
        <div className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <EmptyState icon={MapPin} title="No routes found" description="No routes match your search." />
          ) : (
            filteredRoutes.map(route => (
              <Card key={route.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-text-primary">{route.name}</p>
                    <p className="text-xs text-text-secondary">{route.school_name} — Driver: {route.drivers?.full_name || 'Unassigned'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={route.schedule === 'morning' ? 'warning' : route.schedule === 'afternoon' ? 'info' : 'accent'}>
                      {route.schedule === 'morning' ? 'AM' : route.schedule === 'afternoon' ? 'PM' : 'AM & PM'}
                    </Badge>
                    <Badge variant="primary">
                      <Users className="h-3 w-3 mr-1" />
                      {route.child_route_assignments?.length || 0} kids
                    </Badge>
                  </div>
                </div>
                {/* Stops */}
                <div className="space-y-1.5">
                  {(route.route_stops || [])
                    .sort((a, b) => a.stop_order - b.stop_order)
                    .map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-2 p-2 bg-background rounded-lg text-sm">
                        <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-text-primary">{stop.address}</span>
                      </div>
                    ))}
                  {(!route.route_stops || route.route_stops.length === 0) && (
                    <p className="text-xs text-text-secondary">No stops added yet</p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Reassign modal */}
      <Modal isOpen={!!reassignChild} onClose={() => { setReassignChild(null); setSelectedRouteId('') }} title="Reassign Child to Route">
        {reassignChild && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Reassigning <span className="font-semibold text-text-primary">{reassignChild.full_name}</span> to a new route.
            </p>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary tracking-tight">Select Route</label>
              <select
                value={selectedRouteId}
                onChange={e => setSelectedRouteId(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300"
              >
                <option value="">-- Select a route --</option>
                {allRoutes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.school_name} ({r.drivers?.full_name || 'No driver'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => { setReassignChild(null); setSelectedRouteId('') }}>Cancel</Button>
              <Button fullWidth onClick={handleReassign} loading={reassigning} disabled={!selectedRouteId}>Reassign</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
