import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { CreditCard, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
