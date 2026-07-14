import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Group } from '../types'
import { Users, Plus, Trash2, Pencil, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GroupsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups'),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/groups', body),
    onSuccess: () => {
      toast.success('Group created')
      qc.invalidateQueries({ queryKey: ['groups'] })
      resetForm()
    },
    onError: () => toast.error('Failed to create group'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.put(`/groups/${id}`, body),
    onSuccess: () => {
      toast.success('Group updated')
      qc.invalidateQueries({ queryKey: ['groups'] })
      resetForm()
    },
    onError: () => toast.error('Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      toast.success('Group deleted')
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const groups: Group[] = data?.data?.data ?? []

  function resetForm() {
    setShowForm(false)
    setEditGroup(null)
    setFormName('')
    setFormDesc('')
  }

  function startEdit(g: Group) {
    setEditGroup(g)
    setFormName(g.name)
    setFormDesc(g.description ?? '')
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = { name: formName.trim(), description: formDesc.trim() }
    if (editGroup) updateMutation.mutate({ id: editGroup.id, body })
    else createMutation.mutate(body)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Organize devices into groups</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Group
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{editGroup ? 'Edit Group' : 'New Group'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="label">Name *</label>
              <input className="input" value={formName} onChange={e => setFormName(e.target.value)} required />
            </div>
            <div className="flex-1 min-w-48">
              <label className="label">Description</label>
              <input className="input" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">
                {editGroup ? 'Save' : 'Create'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No groups yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{g.name}</p>
                  {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(g)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => {
                    if (window.confirm(`Delete group "${g.name}"?`)) deleteMutation.mutate(g.id)
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
