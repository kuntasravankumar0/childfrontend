import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Device, Configuration, Group } from '../types'
import {
  Smartphone, Search, Trash2, Eye, Battery,
  Wifi, MapPin, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ONLINE: 'badge-green', ENROLLED: 'badge-yellow',
    PENDING: 'badge-gray',  RESET: 'badge-red'
  }
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>
}

export default function DevicesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', page, search],
    queryFn: () => api.get(`/devices?page=${page}&size=20${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  })

  const { data: configsRes } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.get('/configurations'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/devices/${id}`),
    onSuccess: () => {
      toast.success('Device deleted')
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: () => toast.error('Failed to delete device'),
  })

  const devices: Device[] = data?.data?.data?.devices ?? []
  const total: number     = data?.data?.data?.total   ?? 0
  const pages: number     = data?.data?.data?.pages   ?? 1
  const configs: Configuration[] = configsRes?.data?.data ?? []

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  function confirmDelete(d: Device) {
    if (window.confirm(`Delete device "${d.number}"? This cannot be undone.`)) {
      deleteMutation.mutate(d.id)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-sm text-gray-500 mt-1">{total} device{total !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by ID, model, IMEI…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary text-sm">Search</button>
        {search && (
          <button type="button" className="btn-secondary text-sm"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(0) }}>
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500" />
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No devices found</p>
            <p className="text-sm mt-1">Devices appear here when Android APKs enroll.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Device ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Model</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Battery</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Android</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Sync</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.number}</div>
                      {d.imei && <div className="text-xs text-gray-400">IMEI: {d.imei}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.model || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      {d.batteryLevel != null ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Battery className="w-3.5 h-3.5" />
                          {d.batteryLevel}%
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.androidVersion || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {d.lastSync
                        ? formatDistanceToNow(new Date(d.lastSync), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {d.lat != null && d.lon != null ? (
                        <a
                          href={`https://maps.google.com/?q=${d.lat},${d.lon}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-primary-600 hover:underline text-xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Map
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/devices/${d.id}`}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                          title="View details">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => confirmDelete(d)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete device">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page + 1} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="btn-secondary text-sm disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                className="btn-secondary text-sm disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
