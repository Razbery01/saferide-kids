import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { CheckCircle, XCircle, Eye, Car } from 'lucide-react'
import { format } from 'date-fns'

export default function DriverApprovals() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { fetchDrivers() }, [filter])

  async function fetchDrivers() {
    setLoading(true)
    // Fetch drivers and user info separately to avoid RLS join issues
    let query = supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('verification_status', filter)
    const { data } = await query
    if (data?.length > 0) {
      const driverIds = data.map(d => d.id)
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email, phone, created_at')
        .in('id', driverIds)
      const userMap = Object.fromEntries((userData || []).map(u => [u.id, u]))
      setDrivers(data.map(d => ({ ...d, users: userMap[d.id] || null })))
    } else {
      setDrivers([])
    }
    setLoading(false)
  }

  async function handleApprove(driverId) {
    await supabase.from('drivers').update({ verification_status: 'approved' }).eq('id', driverId)
    fetchDrivers()
  }

  async function handleReject(driverId) {
    if (!confirm('Reject this driver application?')) return
    await supabase.from('drivers').update({ verification_status: 'rejected' }).eq('id', driverId)
    fetchDrivers()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Driver Management</h1>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {drivers.length === 0 ? (
        <Card className="text-center py-8">
          <Car className="h-10 w-10 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-text-secondary">No drivers with status "{filter}"</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {drivers.map(driver => (
            <Card key={driver.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-lg">
                    {driver.users?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{driver.users?.full_name}</p>
                    <p className="text-sm text-text-secondary">{driver.users?.email}</p>
                    <p className="text-sm text-text-secondary">{driver.users?.phone}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-text-secondary">Vehicle:</span> <span className="font-medium">{driver.vehicle_description}</span></div>
                      <div><span className="text-text-secondary">Registration:</span> <span className="font-medium">{driver.vehicle_registration}</span></div>
                      <div><span className="text-text-secondary">Route Code:</span> <span className="font-medium text-primary">{driver.route_code}</span></div>
                      <div><span className="text-text-secondary">Applied:</span> <span className="font-medium">{driver.created_at && format(new Date(driver.created_at), 'MMM d, yyyy')}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    driver.verification_status === 'approved' ? 'success' :
                    driver.verification_status === 'rejected' ? 'danger' : 'warning'
                  }>
                    {driver.verification_status}
                  </Badge>
                </div>
              </div>

              {driver.verification_status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button onClick={() => handleApprove(driver.id)} className="flex-1">
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="danger" onClick={() => handleReject(driver.id)} className="flex-1">
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
