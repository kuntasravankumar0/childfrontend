import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { DeviceNotificationItem } from '../types'
import { ArrowLeft, Bell, Trash2, RefreshCw, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useState } from 'react'

export default function NotificationsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-notifications', id, String(page)],
    queryFn: () => api.get(`/devices/${id}/data/notifications?page=${page}&size=100`),
    enabled: !!id,
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(`/devices/${id}/data/notifications`),
    onSuccess: () => {
      toast.success('All notifications deleted')
      qc.invalidateQueries({ queryKey: ['device-notifications', id] })
    },
    onError: () => toast.error('Failed to delete notifications'),
  })

  // Backend returns { items: [...], total: N, page: P, pages: X }
  const notifData = (data?.data?.data ?? { items: [], total: 0, page: 0, pages: 0 }) as {
    items: DeviceNotificationItem[]
    total: number
    page: number
    pages: number
  }
  const notifications = notifData.items ?? []
  const totalRecords = notifData.total ?? 0
  const totalPages = notifData.pages ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/devices/${id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Device Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{totalRecords} notifications captured</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        {totalRecords > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Delete ALL notifications from this device?'))
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
        ) : notifications.length === 0 && totalRecords === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No notifications captured yet</p>
            <p className="text-sm mt-1">Grant notification access on the device to capture notifications.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className="px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Smartphone className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{n.appName || n.packageName}</span>
                        <span className="badge-gray text-xs">{n.packageName}</span>
                      </div>
                      {n.title && <p className="text-sm font-medium text-gray-800 mt-0.5">{n.title}</p>}
                      {n.text && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.text}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(n.receivedAt), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
