import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Configuration } from '../types'
import { Settings2, Plus, Trash2, Eye, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConfigurationsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.get('/configurations'),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/configurations', body),
    onSuccess: () => {
      toast.success('Configuration created')
      qc.invalidateQueries({ queryKey: ['configurations'] })
      setShowForm(false)
      setFormName('')
      setFormDesc('')
    },
    onError: () => toast.error('Failed to create configuration'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/configurations/${id}`),
    onSuccess: () => {
      toast.success('Configuration deleted')
      qc.invalidateQueries({ queryKey: ['configurations'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const configs: Configuration[] = data?.data?.data ?? []

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return toast.error('Name is required')
    createMutation.mutate({ name: formName.trim(), description: formDesc.trim() })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
          <p className="text-sm text-gray-500 mt-1">Device policy configurations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Config
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">New Configuration</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="label">Name *</label>
              <input className="input" placeholder="e.g. Default Policy"
                value={formName} onChange={e => setFormName(e.target.value)} required />
            </div>
            <div className="flex-1 min-w-48">
              <label className="label">Description</label>
              <input className="input" placeholder="Optional description"
                value={formDesc} onChange={e => setFormDesc(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm"
                disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
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
        ) : configs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No configurations yet</p>
            <p className="text-sm mt-1">Create your first device policy configuration.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {configs.map(cfg => (
              <div key={cfg.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings2 className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{cfg.name}</p>
                  {cfg.description && (
                    <p className="text-xs text-gray-500 truncate">{cfg.description}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {cfg.kioskMode && <span className="badge-blue text-xs">Kiosk</span>}
                    {cfg.gps && <span className="badge-green text-xs">GPS</span>}
                    {cfg.lockStatusBar && <span className="badge-yellow text-xs">Locked Bar</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/configurations/${cfg.id}`}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${cfg.name}"?`))
                        deleteMutation.mutate(cfg.id)
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
