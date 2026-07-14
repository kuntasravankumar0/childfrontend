import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Device, Configuration, DeviceLog, DeviceLocation } from '../types'
import {
  ArrowLeft, Battery, Wifi, MapPin, RefreshCw,
  Bell, Terminal, Info, Package
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'

const SEV: Record<number, { label: string; cls: string }> = {
  1: { label: 'ERROR',   cls: 'badge-red'    },
  2: { label: 'WARN',    cls: 'badge-yellow' },
  3: { label: 'INFO',    cls: 'badge-blue'   },
  4: { label: 'DEBUG',   cls: 'badge-gray'   },
  5: { label: 'VERBOSE', cls: 'badge-gray'   },
}

type Tab = 'info' | 'apps' | 'logs' | 'locations'

function statusBadge(status: string) {
  const m: Record<string, string> = {
    ONLINE: 'badge-green', ENROLLED: 'badge-yellow',
    PENDING: 'badge-gray', RESET: 'badge-red'
  }
  return <span className={m[status] ?? 'badge-gray'}>{status}</span>
}

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-all">{String(value)}</span>
    </div>
  )
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')
  const [configId, setConfigId] = useState('')
  const [pushType, setPushType] = useState('configUpdated')

  const { data: deviceRes, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => api.get(`/devices/${id}`),
    refetchInterval: 30_000,
  })
  const { data: configsRes } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.get('/configurations'),
  })
  const { data: logsRes } = useQuery({
    queryKey: ['device-logs', id],
    queryFn: () => api.get(`/devices/${id}/logs?page=0&size=200`),
    enabled: tab === 'logs',
  })
  const { data: locsRes } = useQuery({
    queryKey: ['device-locations', id],
    queryFn: () => api.get(`/devices/${id}/locations`),
    enabled: tab === 'locations',
  })
  const { data: appsRes } = useQuery({
    queryKey: ['device-apps', id],
    queryFn: () => api.get(`/devices/${id}/apps`),
    enabled: tab === 'apps',
  })

  const updateMutation = useMutation({
    mutationFn: (body: object) => api.put(`/devices/${id}`, body),
    onSuccess: () => {
      toast.success('Device updated')
      qc.invalidateQueries({ queryKey: ['device', id] })
    },
    onError: () => toast.error('Update failed'),
  })
  const pushMutation = useMutation({
    mutationFn: () => api.post(`/devices/${id}/push`, { messageType: pushType }),
    onSuccess: () => toast.success('Push queued'),
    onError: () => toast.error('Push failed'),
  })

  const device: Device         = deviceRes?.data?.data
  const configs: Configuration[] = configsRes?.data?.data ?? []
  const logs: DeviceLog[]        = logsRes?.data?.data    ?? []
  const locations: DeviceLocation[] = locsRes?.data?.data ?? []
  const installedApps: any[]    = appsRes?.data?.data     ?? []

  useEffect(() => {
    if (device?.configId) setConfigId(String(device.configId))
  }, [device])

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  )
  if (!device) return <div className="text-center py-20 text-gray-400">Device not found</div>

  const TABS = [
    { key: 'info'      as Tab, label: 'Info',      icon: Info },
    { key: 'apps'      as Tab, label: `Apps (${installedApps.length})`, icon: Package },
    { key: 'logs'      as Tab, label: 'Logs',      icon: Terminal },
    { key: 'locations' as Tab, label: 'Locations', icon: MapPin },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{device.number}</h1>
          <p className="text-sm text-gray-500">{device.model || 'Unknown model'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(device.status)}
          {device.lastSync && (
            <span className="text-xs text-gray-400">
              Synced {formatDistanceToNow(new Date(device.lastSync), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <Battery className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Battery</p>
            <p className="font-semibold text-sm">{device.batteryLevel != null ? `${device.batteryLevel}%` : '—'}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Wifi className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Android</p>
            <p className="font-semibold text-sm">{device.androidVersion || '—'}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-semibold text-xs truncate">
              {device.lat != null ? `${device.lat.toFixed(4)}, ${device.lon!.toFixed(4)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Assign Configuration</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={configId} onChange={e => setConfigId(e.target.value)}>
              <option value="">— Select —</option>
              {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => updateMutation.mutate({ configId })} className="btn-primary text-sm">
              Apply
            </button>
          </div>
          {device.configId && (
            <p className="text-xs text-gray-400 mt-1">
              Current: {configs.find(c => c.id === device.configId)?.name ?? `#${device.configId}`}
            </p>
          )}
        </div>
        <div>
          <label className="label">Push Command</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={pushType} onChange={e => setPushType(e.target.value)}>
              <option value="configUpdated">Refresh Config</option>
              <option value="reboot">Reboot</option>
              <option value="lock">Lock Device</option>
              <option value="factoryReset">Factory Reset</option>
            </select>
            <button onClick={() => pushMutation.mutate()} disabled={pushMutation.isPending}
              className="btn-primary text-sm">
              <Bell className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                ${tab === t.key
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="grid sm:grid-cols-2 gap-x-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hardware</p>
                <Row label="Device ID"         value={device.number} />
                <Row label="Model"             value={device.model} />
                <Row label="Serial"            value={device.serial} />
                <Row label="CPU"               value={device.cpu} />
                <Row label="Android Version"   value={device.androidVersion} />
                <Row label="Launcher Package"  value={device.launcherPackage} />
                <Row label="Kiosk Mode"        value={device.kioskMode ? 'Yes' : 'No'} />
                <Row label="MDM Mode"          value={device.mdmMode ? 'Yes' : 'No'} />
                <Row label="Default Launcher"  value={device.defaultLauncher ? 'Yes' : 'No'} />
                <Row label="Battery"           value={device.batteryLevel != null ? `${device.batteryLevel}% (${device.batteryCharging ?? 'discharging'})` : undefined} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Network / SIM</p>
                <Row label="IMEI"        value={device.imei} />
                <Row label="IMEI 2"      value={device.imei2} />
                <Row label="Phone"       value={device.phone} />
                <Row label="Phone 2"     value={device.phone2} />
                <Row label="ICCID"       value={device.iccid} />
                <Row label="ICCID 2"     value={device.iccid2} />
                <Row label="IMSI"        value={device.imsi} />
                <Row label="IP Address"  value={device.ipAddress} />
                <Row label="External IP" value={device.externalIp} />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Custom</p>
                <Row label="Custom 1"    value={device.custom1} />
                <Row label="Custom 2"    value={device.custom2} />
                <Row label="Custom 3"    value={device.custom3} />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Location</p>
                <Row label="Latitude"    value={device.lat} />
                <Row label="Longitude"   value={device.lon} />
                {device.lat != null && (
                  <a href={`https://maps.google.com/?q=${device.lat},${device.lon}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── APPS ── */}
          {tab === 'apps' && (
            installedApps.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No app data yet — will appear after device syncs</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-2">{installedApps.length} apps reported</p>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Package</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Version</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {installedApps.map((app: any) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-xs text-gray-700">{app.pkg}</td>
                        <td className="px-3 py-1.5 text-gray-600">{app.version || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span className={app.installed ? 'badge-green' : 'badge-red'}>
                            {app.installed ? 'Installed' : 'Removed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── LOGS ── */}
          {tab === 'logs' && (
            logs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Terminal className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No logs yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto font-mono text-xs space-y-0.5">
                {logs.map(log => {
                  const sev = SEV[log.severity] ?? { label: String(log.severity), cls: 'badge-gray' }
                  return (
                    <div key={log.id} className="flex gap-2 py-1 border-b border-gray-50">
                      <span className="text-gray-400 flex-shrink-0 w-32">
                        {format(new Date(log.logTime), 'MM-dd HH:mm:ss')}
                      </span>
                      <span className={`${sev.cls} flex-shrink-0 text-xs`}>{sev.label}</span>
                      {log.tag && <span className="text-gray-500 flex-shrink-0 w-24 truncate">{log.tag}</span>}
                      <span className="text-gray-800 break-all">{log.message}</span>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── LOCATIONS ── */}
          {tab === 'locations' && (
            locations.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No location history</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-2">{locations.length} location records</p>
                <div className="space-y-0.5">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center gap-4 py-1.5 border-b border-gray-50 text-sm">
                      <span className="text-gray-400 text-xs w-40 flex-shrink-0">
                        {format(new Date(loc.ts), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                      <span className="text-gray-700 font-mono text-xs">
                        {loc.lat.toFixed(6)}, {loc.lon.toFixed(6)}
                      </span>
                      <a href={`https://maps.google.com/?q=${loc.lat},${loc.lon}`}
                        target="_blank" rel="noreferrer"
                        className="text-primary-600 hover:underline text-xs ml-auto flex-shrink-0 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Map
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  )
}
