import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { CreditCard, TrendingUp, Clock, XCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { SUBSCRIPTION_PRICES } from '../../lib/constants'

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [tierCounts, setTierCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, role, subscription_tier, trial_ends_at, is_active')
      .order('created_at', { ascending: false })

    setSubscriptions(users || [])

    const counts = {}
    ;(users || []).forEach(u => {
      counts[u.subscription_tier] = (counts[u.subscription_tier] || 0) + 1
    })
    setTierCounts(counts)
    setLoading(false)
  }

  async function handleExtendTrial(userId, currentTrialEnds) {
    const newDate = addDays(currentTrialEnds ? new Date(currentTrialEnds) : new Date(), 7)
    const { error } = await supabase
      .from('users')
      .update({ trial_ends_at: newDate.toISOString() })
      .eq('id', userId)
    if (!error) fetchData()
  }

  async function handleCancel(userId) {
    const { error } = await supabase
      .from('users')
      .update({ subscription_tier: 'cancelled', is_active: false })
      .eq('id', userId)
    if (!error) fetchData()
  }

  const mrr = Object.entries(tierCounts).reduce((acc, [tier, count]) => {
    const price = SUBSCRIPTION_PRICES[tier]?.amount || 0
    return acc + price * count
  }, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Subscriptions & Billing</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">MRR</p>
          <p className="text-2xl font-bold text-primary mt-1">R{mrr.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Trial Users</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{tierCounts['trial'] || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Paid Parents</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{(tierCounts['parent_basic'] || 0) + (tierCounts['parent_premium'] || 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Driver Pro</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{tierCounts['driver_pro'] || 0}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Trial Ends</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(user => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'driver' ? 'warning' : 'primary'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.subscription_tier}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {user.trial_ends_at ? format(new Date(user.trial_ends_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {user.subscription_tier === 'trial' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleExtendTrial(user.id, user.trial_ends_at)}
                        >
                          <Clock className="h-3.5 w-3.5" /> +7 days
                        </Button>
                      )}
                      {user.is_active && user.subscription_tier !== 'cancelled' && (
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleCancel(user.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
