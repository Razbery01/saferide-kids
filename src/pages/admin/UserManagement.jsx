import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Search, UserX, UserCheck, Pencil, Trash2, Eye, Plus, Users, ArrowUpCircle } from 'lucide-react'
import { format } from 'date-fns'

const ROLES = ['parent', 'driver', 'admin']
const TIERS = ['trial', 'parent_basic', 'parent_premium', 'driver_pro']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  // Modal states
  const [viewUser, setViewUser] = useState(null)
  const [editUser, setEditUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteUser, setDeleteUser] = useState(null)
  const [upgradeUser, setUpgradeUser] = useState(null)
  const [upgradeTier, setUpgradeTier] = useState('parent_basic')

  // Form state
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'parent', subscription_tier: 'trial' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  useEffect(() => { fetchUsers() }, [roleFilter])

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(''), 3000)
    return () => clearTimeout(t)
  }, [notification])

  async function fetchUsers() {
    setLoading(true)
    let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200)
    if (roleFilter !== 'all') query = query.eq('role', roleFilter)
    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }

  // ── Create ──
  function openCreate() {
    setForm({ full_name: '', email: '', phone: '', role: 'parent', subscription_tier: 'trial' })
    setError('')
    setShowCreate(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!form.full_name.trim() || !form.email.trim()) {
        throw new Error('Name and email are required.')
      }

      // Create auth user via Supabase Admin (requires service_role or admin RLS)
      // Since we're on the client with anon key, we create the profile row directly.
      // The user will need to use "forgot password" to set their password.
      const userId = crypto.randomUUID()
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      const { error: rpcErr } = await supabase.rpc('admin_create_user', {
        user_id: userId,
        user_email: form.email.trim(),
        user_full_name: form.full_name.trim(),
        user_role: form.role,
        user_phone: form.phone.trim() || null,
        user_subscription_tier: form.subscription_tier,
      })

      if (rpcErr) {
        // Fallback: direct insert into users table (admin RLS allows this)
        const { error: insertErr } = await supabase.from('users').insert({
          id: userId,
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          subscription_tier: form.subscription_tier,
          trial_ends_at: trialEnd.toISOString(),
          is_active: true,
        })
        if (insertErr) throw insertErr
      }

      setShowCreate(false)
      setNotification(`User "${form.full_name}" created.`)
      fetchUsers()
    } catch (err) {
      setError(err.message?.includes('duplicate') ? 'A user with this email already exists.' : (err.message || 'Failed to create user.'))
    } finally {
      setSaving(false)
    }
  }

  // ── View ──
  async function openView(user) {
    // Fetch related data
    const [childrenRes, driverRes, subsRes] = await Promise.all([
      supabase.from('children').select('id, full_name, school_name, grade').eq('parent_id', user.id),
      supabase.from('drivers').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    setViewUser({
      ...user,
      children: childrenRes.data || [],
      driver: driverRes.data,
      subscription: subsRes.data,
    })
  }

  // ── Edit ──
  function openEdit(user) {
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'parent',
      subscription_tier: user.subscription_tier || 'trial',
    })
    setError('')
    setEditUser(user)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!form.full_name.trim()) throw new Error('Name is required.')

      const { error: updateErr } = await supabase.from('users').update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        subscription_tier: form.subscription_tier,
      }).eq('id', editUser.id)

      if (updateErr) throw updateErr

      setEditUser(null)
      setNotification(`User "${form.full_name}" updated.`)
      fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle Active ──
  async function toggleActive(user) {
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id)
    setNotification(`${user.full_name} ${user.is_active ? 'deactivated' : 'activated'}.`)
    fetchUsers()
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteUser) return
    setSaving(true)

    try {
      // Try server-side cascade delete first
      const { error: rpcErr } = await supabase.rpc('delete_user_data', { target_user_id: deleteUser.id })

      if (rpcErr) {
        // Fallback: just deactivate
        const { error: updateErr } = await supabase.from('users').update({ is_active: false }).eq('id', deleteUser.id)
        if (updateErr) throw updateErr
        setNotification(`User "${deleteUser.full_name}" deactivated (full deletion requires server function).`)
      } else {
        setNotification(`User "${deleteUser.full_name}" and all associated data deleted.`)
      }

      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to delete user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickUpgrade() {
    if (!upgradeUser) return
    setSaving(true)
    try {
      const { error: updateErr } = await supabase.from('users').update({
        subscription_tier: upgradeTier,
      }).eq('id', upgradeUser.id)
      if (updateErr) throw updateErr
      setNotification(`${upgradeUser.full_name} upgraded to ${upgradeTier.replace(/_/g, ' ')}.`)
      setUpgradeUser(null)
      fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to upgrade user.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    parents: users.filter(u => u.role === 'parent').length,
    drivers: users.filter(u => u.role === 'driver').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-text-primary' },
          { label: 'Active', value: stats.active, color: 'text-success' },
          { label: 'Parents', value: stats.parents, color: 'text-primary' },
          { label: 'Drivers', value: stats.drivers, color: 'text-secondary' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input icon={Search} placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} />
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

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-text-secondary text-sm">Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-text-secondary text-sm">No users found</td></tr>
              ) : (
                filtered.map(user => (
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
                    <td className="px-4 py-3 text-sm text-text-secondary">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'admin' ? 'info' : user.role === 'driver' ? 'warning' : 'primary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{user.subscription_tier}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? 'success' : 'danger'} dot>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {user.created_at && format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-text-primary transition" title="View details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-blue-50 text-text-secondary hover:text-blue-600 transition" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setUpgradeUser(user); setUpgradeTier(user.subscription_tier || 'parent_basic') }}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-text-secondary hover:text-emerald-600 transition"
                          title="Upgrade Account"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`p-1.5 rounded-lg transition ${
                            user.is_active ? 'hover:bg-red-50 text-text-secondary hover:text-danger' : 'hover:bg-green-50 text-text-secondary hover:text-success'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setDeleteUser(user)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-3 border-t border-border text-xs text-text-secondary">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </Card>

      {/* ── View User Modal ── */}
      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Details" size="lg">
        {viewUser && (
          <div className="space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl">
                {viewUser.full_name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{viewUser.full_name}</h3>
                <p className="text-sm text-text-secondary">{viewUser.email}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Badge variant={viewUser.is_active ? 'success' : 'danger'} dot>{viewUser.is_active ? 'Active' : 'Inactive'}</Badge>
                <Badge variant={viewUser.role === 'admin' ? 'info' : viewUser.role === 'driver' ? 'warning' : 'primary'}>{viewUser.role}</Badge>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Phone" value={viewUser.phone || 'Not provided'} />
              <DetailItem label="Subscription" value={viewUser.subscription_tier} />
              <DetailItem label="Joined" value={viewUser.created_at ? format(new Date(viewUser.created_at), 'MMMM d, yyyy') : '—'} />
              <DetailItem label="Trial ends" value={viewUser.trial_ends_at ? format(new Date(viewUser.trial_ends_at), 'MMMM d, yyyy') : '—'} />
              <DetailItem label="User ID" value={viewUser.id} mono />
            </div>

            {/* Children (for parents) */}
            {viewUser.children?.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Children ({viewUser.children.length})</h4>
                <div className="space-y-2">
                  {viewUser.children.map(child => (
                    <div key={child.id} className="flex items-center gap-3 p-2.5 bg-background rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold text-xs">
                        {child.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{child.full_name}</p>
                        <p className="text-xs text-text-secondary">{child.school_name}{child.grade ? ` · Grade ${child.grade}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Driver info */}
            {viewUser.driver && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Driver Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Route Code" value={viewUser.driver.route_code || '—'} mono />
                  <DetailItem label="Verification" value={viewUser.driver.verification_status} />
                  <DetailItem label="Vehicle" value={viewUser.driver.vehicle_description || '—'} />
                  <DetailItem label="Registration" value={viewUser.driver.vehicle_registration || '—'} />
                  <DetailItem label="Licence #" value={viewUser.driver.licence_number || '—'} />
                  <DetailItem label="ID Number" value={viewUser.driver.id_number ? '••••••' + viewUser.driver.id_number.slice(-4) : '—'} />
                </div>
              </div>
            )}

            {/* Subscription info */}
            {viewUser.subscription && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">Subscription</h4>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Plan" value={viewUser.subscription.plan} />
                  <DetailItem label="Status" value={viewUser.subscription.status} />
                  <DetailItem label="Period start" value={viewUser.subscription.current_period_start ? format(new Date(viewUser.subscription.current_period_start), 'MMM d, yyyy') : '—'} />
                  <DetailItem label="Period end" value={viewUser.subscription.current_period_end ? format(new Date(viewUser.subscription.current_period_end), 'MMM d, yyyy') : '—'} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => { const u = viewUser; setViewUser(null); openEdit(u) }}>
                <Pencil className="h-4 w-4" /> Edit User
              </Button>
              <Button variant="outline" fullWidth onClick={() => setViewUser(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create User Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-danger bg-red-50 p-3 rounded-xl">{error}</p>}
          <Input label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Phone (optional)" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Subscription Tier</label>
            <select
              value={form.subscription_tier}
              onChange={e => setForm(f => ({ ...f, subscription_tier: e.target.value }))}
              className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {TIERS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <p className="text-xs text-text-secondary">Note: This creates a profile record. The user will need to register or use password reset to set their login credentials.</p>
          <Button type="submit" fullWidth loading={saving}>Create User</Button>
        </form>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-danger bg-red-50 p-3 rounded-xl">{error}</p>}
            <Input label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            <Input label="Email" type="email" value={form.email} disabled className="opacity-60 cursor-not-allowed" />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Subscription Tier</label>
              <select
                value={form.subscription_tier}
                onChange={e => setForm(f => ({ ...f, subscription_tier: e.target.value }))}
                className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {TIERS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="bg-primary/5 rounded-xl p-3 mt-2">
              <p className="text-xs font-medium text-text-secondary mb-2">Quick Upgrade (no payment required)</p>
              <div className="flex gap-2">
                {['parent_basic', 'parent_premium', 'driver_pro'].map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, subscription_tier: tier }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      form.subscription_tier === tier
                        ? 'bg-primary text-white'
                        : 'bg-white border border-border text-text-secondary hover:border-primary'
                    }`}
                  >
                    {tier.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" fullWidth loading={saving}>Save Changes</Button>
          </form>
        )}
      </Modal>

      {/* ── Upgrade User Modal ── */}
      <Modal isOpen={!!upgradeUser} onClose={() => setUpgradeUser(null)} title="Upgrade Account" size="sm">
        {upgradeUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                {upgradeUser.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-sm text-text-primary">{upgradeUser.full_name}</p>
                <p className="text-xs text-text-secondary">Current: {upgradeUser.subscription_tier}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">Select new tier (no payment required)</p>
              <div className="flex flex-col gap-2">
                {['parent_basic', 'parent_premium', 'driver_pro'].map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setUpgradeTier(tier)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                      upgradeTier === tier
                        ? 'bg-primary text-white'
                        : 'bg-white border border-border text-text-secondary hover:border-primary'
                    }`}
                  >
                    {tier.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <Button fullWidth loading={saving} onClick={handleQuickUpgrade}>Save Upgrade</Button>
          </div>
        )}
      </Modal>

      {/* ── Delete User Modal ── */}
      <Modal isOpen={!!deleteUser} onClose={() => setDeleteUser(null)} title="Delete User" size="sm">
        {deleteUser && (
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7 text-danger" />
            </div>
            <p className="font-semibold text-text-primary mb-1">Delete {deleteUser.full_name}?</p>
            <p className="text-sm text-text-secondary mb-6">
              This will permanently delete this user and all their data including children, trips, messages, and subscriptions. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setDeleteUser(null)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleDelete} loading={saving}>Delete User</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {notification}
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-sm text-text-primary mt-0.5 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  )
}
