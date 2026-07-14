import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { User } from '../types'
import { Users as UsersIcon, Plus, Trash2, RefreshCw, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function UsersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [pwdUserId, setPwdUserId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({ login: '', password: '', name: '', email: '', role: 'ADMIN' })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/users', body),
    onSuccess: () => {
      toast.success('User created')
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setForm({ login: '', password: '', name: '', email: '', role: 'ADMIN' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const pwdMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.put(`/users/${id}/password`, { password }),
    onSuccess: () => {
      toast.success('Password changed')
      setPwdUserId(null)
      setNewPassword('')
    },
    onError: () => toast.error('Failed to change password'),
  })

  const users: User[] = data?.data?.data ?? []

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Admin panel user accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">New User</h2>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.login} onChange={e => set('login', e.target.value)} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)} required />
            </div>
            <div>
              <label className="label">Display Name</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Change password modal */}
      {pwdUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
            <input className="input mb-4" type="password" placeholder="New password"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button className="btn-primary text-sm flex-1"
                disabled={!newPassword || pwdMutation.isPending}
                onClick={() => pwdMutation.mutate({ id: pwdUserId, password: newPassword })}>
                {pwdMutation.isPending ? 'Saving…' : 'Change Password'}
              </button>
              <button className="btn-secondary text-sm" onClick={() => { setPwdUserId(null); setNewPassword('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.login}</td>
                  <td className="px-4 py-3 text-gray-600">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={u.role === 'SUPER_ADMIN' ? 'badge-blue' : 'badge-gray'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.createdAt ? format(new Date(u.createdAt), 'yyyy-MM-dd') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setPwdUserId(u.id); setNewPassword('') }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                        title="Change password">
                        <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        if (window.confirm(`Delete user "${u.login}"?`)) deleteMutation.mutate(u.id)
                      }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
