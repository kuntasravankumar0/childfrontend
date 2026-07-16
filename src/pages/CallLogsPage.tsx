import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStorageQuery } from '../hooks/useStorageQuery'
import api from '../lib/api'
import { CallLogItem } from '../types'
import { ArrowLeft, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, RefreshCw, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useState } from 'react'

const CALL_ICONS: Record<string, React.ElementType> = {
  INCOMING: PhoneIncoming,
  OUTGOING: PhoneOutgoing,
  MISSED: PhoneMissed,
  REJECTED: PhoneMissed,
}

const CALL_COLORS: Record<string, string> = {
  INCOMING: 'text-green-600',
  OUTGOING: 'text-blue-600',
  MISSED: 'text-red-600',
  REJECTED: 'text-red-600',
}

const CALL_BADGES: Record<string, string> = {
  INCOMING: 'badge-green',
  OUTGOING: 'badge-blue',
  MISSED: 'badge-red',
  REJECTED: 'badge-red',
}

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0s'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

export default function CallLogsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [callSearch, setCallSearch] = useState('')
  const [callTypeFilter, setCallTypeFilter] = useState('ALL')
  const [callDateFrom, setCallDateFrom] = useState('')
  const [callDateTo, setCallDateTo] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useStorageQuery({
    queryKey: ['device-calls', id!, String(page), callSearch, callTypeFilter, callDateFrom, callDateTo],
    fetcher: () => {
      const params = new URLSearchParams({ page: String(page), size: '100' })
      if (callSearch) params.set('search', callSearch)
      if (callTypeFilter !== 'ALL') params.set('type', callTypeFilter)
      if (callDateFrom) params.set('dateFrom', String(new Date(callDateFrom).getTime()))
      if (callDateTo) params.set('dateTo', String(new Date(callDateTo).getTime() + 86400000))
      return api.get(`/devices/${id}/data/calls?${params}`)
    },
    enabled: !!id,
    staleSeconds: 120,
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(`/devices/${id}/data/calls`),
    onSuccess: () => {
      toast.success('All call logs deleted')
      qc.invalidateQueries({ queryKey: ['device-calls', id] })
    },
    onError: () => toast.error('Failed to delete call logs'),
  })

  // Backend returns { items: [...], total: N, page: P, pages: X }
  const callsData = (data ?? { items: [], total: 0, page: 0, pages: 0 }) as { items?: CallLogItem[]; total?: number; page?: number; pages?: number }
  const callLogs = callsData.items ?? []
  const totalRecords = callsData.total ?? 0
  const totalPages = callsData.pages ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/devices/${id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
          <p className="text-sm text-gray-500 mt-1">{totalRecords.toLocaleString()} call records</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        {totalRecords > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Delete ALL call logs from this device?'))
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
        ) : totalRecords === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{(callSearch || callTypeFilter !== 'ALL' || callDateFrom || callDateTo) ? 'No calls match your filters' : 'No call logs synced yet'}</p>
            <p className="text-sm mt-1">Call history will appear after the device syncs.</p>
          </div>
        ) : (
          <>
            {/* ── Server-side Search / Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by phone number..."
                value={callSearch}
                onChange={e => { setCallSearch(e.target.value); setPage(0); }}
                className="input flex-1 min-w-[160px] text-sm"
              />
              <select
                value={callTypeFilter}
                onChange={e => { setCallTypeFilter(e.target.value); setPage(0); }}
                className="input w-auto text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
                <option value="MISSED">Missed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <input
                type="date"
                value={callDateFrom}
                onChange={e => { setCallDateFrom(e.target.value); setPage(0); }}
                className="input w-auto text-sm"
                title="From date"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={callDateTo}
                onChange={e => { setCallDateTo(e.target.value); setPage(0); }}
                className="input w-auto text-sm"
                title="To date"
              />
              {(callSearch || callTypeFilter !== 'ALL' || callDateFrom || callDateTo) && (
                <button
                  onClick={() => { setCallSearch(''); setCallTypeFilter('ALL'); setCallDateFrom(''); setCallDateTo(''); setPage(0); }}
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-50">
              {callLogs.map(log => {
                const Icon = CALL_ICONS[log.callType] || Phone
                const color = CALL_COLORS[log.callType] || 'text-gray-600'
                return (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                    <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{log.contactName || log.phoneNumber || 'Unknown'}</span>
                        <span className={CALL_BADGES[log.callType] || 'badge-gray'}>{log.callType}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{log.phoneNumber || ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{format(new Date(log.callDate), 'MMM dd, HH:mm')}</p>
                      <p className="text-xs text-gray-400">{formatDuration(log.durationSec)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Pagination ── */}
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
                  Page {page + 1} of {totalPages} ({totalRecords.toLocaleString()} records)
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
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
