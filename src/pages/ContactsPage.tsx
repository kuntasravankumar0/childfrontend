import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { DeviceContact } from '../types'
import { ArrowLeft, Phone, Mail, Trash2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function ContactsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-contacts', id, String(page)],
    queryFn: () => api.get(`/devices/${id}/data/contacts?page=${page}&size=200`),
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

  // Backend returns { items: [...], total: N, page: P, pages: X }
  const contactsData = (data?.data?.data ?? { items: [], total: 0, pages: 0 }) as { items?: DeviceContact[]; total?: number; page?: number; pages?: number }
  const contacts = contactsData.items ?? []
  const totalContacts = contactsData.total ?? 0
  const totalPages = contactsData.pages ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/devices/${id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Device Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">{totalContacts} contacts</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        {totalContacts > 0 && (
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
        ) : contacts.length === 0 && totalContacts === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No contacts synced yet</p>
            <p className="text-sm mt-1">Contacts will appear after the device syncs daily.</p>
          </div>
        ) : (
          <>
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
                        <span className="text-xs text-gray-400">—</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4 border-t border-gray-100">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
