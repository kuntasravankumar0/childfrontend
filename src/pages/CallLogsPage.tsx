import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { CallLogItem } from '../types'
import { ArrowLeft, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

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
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

export default function CallLogsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['device-calls', id],
    queryFn: () => api.get(`/devices/${id}/data/calls`),
    enabled: !!id,
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(`/devices/${id}/data/calls`),
    onSuccess: () => {
      toast.success('All call logs deleted')
      qc.invalidateQueries({ queryKey: ['device-calls', id] })
    },
    onError: () => toast.error('Failed to delete call logs'),
  })

  const callLogs: CallLogItem[] = data?.data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`/devices/${id}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
          <p className="text-sm text-gray-500 mt-1">{callLogs.length} call records</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
        </button>
        {callLogs.length > 0 && (
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
        ) : callLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No call logs synced yet</p>
            <p className="text-sm mt-1">Call history will appear after the device syncs.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
