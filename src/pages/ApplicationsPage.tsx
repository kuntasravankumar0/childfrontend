import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Application } from '../types'
import { Package, Plus, Trash2, RefreshCw, Upload, Link as LinkIcon } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', pkg: '', version: '', url: '', type: 'app' as const, description: '' }

export default function ApplicationsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications'),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/applications', body),
    onSuccess: () => {
      toast.success('Application added')
      qc.invalidateQueries({ queryKey: ['applications'] })
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
    },
    onError: () => toast.error('Failed to add application'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/applications/${id}`),
    onSuccess: () => {
      toast.success('Application removed')
      qc.invalidateQueries({ queryKey: ['applications'] })
    },
  })

  const apps: Application[] = data?.data?.data ?? []

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.pkg.trim()) return toast.error('Name and Package ID are required')
    createMutation.mutate(form)
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">{apps.length} app{apps.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add App
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Add Application</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" placeholder="App Name" value={form.name}
                  onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Package ID *</label>
                <input className="input" placeholder="com.example.app" value={form.pkg}
                  onChange={e => set('pkg', e.target.value)} required />
              </div>
              <div>
                <label className="label">Version</label>
                <input className="input" placeholder="1.0.0" value={form.version}
                  onChange={e => set('version', e.target.value)} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type}
                  onChange={e => set('type', e.target.value as typeof form.type)}>
                  <option value="app">Android App (APK)</option>
                  <option value="web">Web Link</option>
                  <option value="intent">Intent Shortcut</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">URL (APK download or web link)</label>
                <input className="input" placeholder="https://example.com/app.apk" value={form.url}
                  onChange={e => set('url', e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <label className="label">Description</label>
                <input className="input" value={form.description}
                  onChange={e => set('description', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm"
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding…' : 'Add Application'}
              </button>
              <button type="button" className="btn-secondary text-sm"
                onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" />
          </div>
        ) : apps.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No applications yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Package ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">URL</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {apps.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {app.icon
                          ? <img src={app.icon} alt="" className="w-6 h-6 rounded" />
                          : <Package className="w-4 h-4 text-gray-400" />}
                        {app.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{app.pkg}</td>
                    <td className="px-4 py-3 text-gray-600">{app.version || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={app.type === 'app' ? 'badge-blue' : app.type === 'web' ? 'badge-green' : 'badge-yellow'}>
                        {app.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs">
                      {app.url ? (
                        <a href={app.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-primary-600 hover:underline text-xs truncate">
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{app.url}</span>
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => {
                        if (window.confirm(`Remove "${app.name}"?`)) deleteMutation.mutate(app.id)
                      }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
