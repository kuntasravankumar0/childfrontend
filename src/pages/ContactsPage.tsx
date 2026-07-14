import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { DeviceContact } from '../types'
import { ArrowLeft, Phone, Mail, Trash2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-contacts', id],
    queryFn: () => api.get(`/devices/${id}/data/contacts`),
    enabled: !!id,
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(`/devices/${id}/data/contacts`),
    onSuccess: () => {
      toast.success('All contacts deleted')
      qc.invalidateQueries({ queryKey: ['device-contacts', id] })
    },
    onError: () => toast.error('Failed to delete contacts'),
  })

  const contacts: DeviceContact[] = data?.data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/devices/${id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Device Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} contacts</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        {contacts.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Delete ALL contacts from this device\'s data?'))
                deleteAllMutation.mutate()
            }}
            className="btn-danger text-sm">
            <Trash2 className="w-4 h-4" /> Delete All
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No contacts synced yet</p>
            <p className="text-sm mt-1">Contacts will appear after the device syncs daily.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3" /> {c.phone || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-blue text-xs">{c.phoneType || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.email ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-3 h-3" /> {c.email}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete contact "${c.name || c.phone}"?`)) {
                            api.delete(`/devices/${id}/data/contacts/${c.id}`).then(() => {
                              toast.success('Contact deleted')
                              qc.invalidateQueries({ queryKey: ['device-contacts', id] })
                            }).catch(() => toast.error('Delete failed'))
                          }
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
