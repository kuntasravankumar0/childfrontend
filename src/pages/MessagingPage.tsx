import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Device } from '../types'
import { MessageSquare, Send, Radio, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function MessagingPage() {
  const qc = useQueryClient()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [messageText, setMessageText] = useState('')
  const [broadcastText, setBroadcastText] = useState('')

  const { data: devicesRes } = useQuery({
    queryKey: ['devices-all'],
    queryFn: () => api.get('/devices?page=0&size=200'),
  })
  const devices: Device[] = devicesRes?.data?.data?.devices ?? []

  const { data: historyRes, refetch: refetchHistory } = useQuery({
    queryKey: ['msg-history', selectedDeviceId],
    queryFn: () => api.get(`/messaging/device/${selectedDeviceId}/history`),
    enabled: !!selectedDeviceId,
  })
  const history: any[] = historyRes?.data?.data ?? []

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/messaging/device/${selectedDeviceId}/message`, { message: messageText }),
    onSuccess: () => {
      toast.success('Message queued for delivery')
      setMessageText('')
      refetchHistory()
    },
    onError: () => toast.error('Failed to send message'),
  })

  const broadcastMutation = useMutation({
    mutationFn: () => api.post('/messaging/broadcast', { message: broadcastText }),
    onSuccess: (res) => {
      toast.success(`Message broadcast to ${res.data?.data?.queued ?? 0} devices`)
      setBroadcastText('')
    },
    onError: () => toast.error('Broadcast failed'),
  })

  function msgTypeBadge(type: string) {
    const map: Record<string, string> = {
      textMessage:    'badge-blue',
      configUpdated:  'badge-green',
      reboot:         'badge-red',
      lock:           'badge-yellow',
      factoryReset:   'badge-red',
    }
    return <span className={map[type] ?? 'badge-gray'}>{type}</span>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>
        <p className="text-sm text-gray-500 mt-1">Send messages and commands to Android devices (Pager Plugin)</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Single device message */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Send to Device</h2>
          </div>

          <div>
            <label className="label">Select Device</label>
            <select className="input" value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}>
              <option value="">— Select a device —</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.number} {d.model ? `(${d.model})` : ''} — {d.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Type your message here…"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            />
          </div>

          <button
            className="btn-primary w-full justify-center"
            disabled={!selectedDeviceId || !messageText.trim() || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}>
            <Send className="w-4 h-4" />
            {sendMutation.isPending ? 'Sending…' : 'Send Message'}
          </button>
        </div>

        {/* Broadcast */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Broadcast to All Devices</h2>
          </div>
          <p className="text-sm text-gray-500">
            Sends a text notification to every enrolled device simultaneously.
          </p>

          <div>
            <label className="label">Broadcast Message</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Type broadcast message…"
              value={broadcastText}
              onChange={e => setBroadcastText(e.target.value)}
            />
          </div>

          <button
            className="btn-danger w-full justify-center"
            disabled={!broadcastText.trim() || broadcastMutation.isPending}
            onClick={() => {
              if (window.confirm(`Send to ALL ${devices.length} devices?`))
                broadcastMutation.mutate()
            }}>
            <Radio className="w-4 h-4" />
            {broadcastMutation.isPending ? 'Broadcasting…' : `Broadcast to ${devices.length} devices`}
          </button>
        </div>
      </div>

      {/* Message history */}
      {selectedDeviceId && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Message History</h2>
            <button onClick={() => refetchHistory()} className="btn-secondary text-sm">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No messages yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Payload</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((msg: any) => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                        {format(new Date(msg.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-4 py-2">{msgTypeBadge(msg.messageType)}</td>
                      <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{msg.payload || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={msg.sent ? 'badge-green' : 'badge-yellow'}>
                          {msg.sent ? 'Delivered' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
