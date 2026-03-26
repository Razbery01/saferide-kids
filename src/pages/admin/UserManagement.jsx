import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { Search, UserX, UserCheck, Eye } from 'lucide-react'
import { format } from 'date-fns'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [roleFilter])

  async function fetchUsers() {
    setLoading(true)
    let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100)
    if (roleFilter !== 'all') query = query.eq('role', roleFilter)
    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }

  async function toggleActive(user) {
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id)
    fetchUsers()
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">User Management</h1>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input icon={Search} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'parent', 'driver', 'admin'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                roleFilter === role ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                        {user.full_name?.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-text-primary">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'info' : user.role === 'driver' ? 'warning' : 'primary'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{user.subscription_tier}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {user.created_at && format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`p-1.5 rounded-lg transition ${
                        user.is_active ? 'hover:bg-red-50 text-text-secondary hover:text-danger' : 'hover:bg-green-50 text-text-secondary hover:text-success'
                      }`}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-text-secondary text-sm">No users found</div>
        )}
      </Card>
    </div>
  )
}
