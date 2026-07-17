import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Device, DeviceFeatures } from '../types'
import {
  Smartphone, Search, Trash2, Eye, Battery,
  Wifi, MapPin, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Phone, Users, Map, Activity, Cpu, Radio
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

// ─── Feature definition: label, icon, description ──────────────────────
const FEATURE_DEFS: { key: keyof DeviceFeatures; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'gps',          label: 'GPS / Location',    icon: MapPin,  desc: 'Device reports GPS coordinates' },
  { key: 'imei',         label: 'IMEI / Network',    icon: Radio,   desc: 'IMEI number reported by device' },
  { key: 'networkInfo',  label: 'SIM / Phone',       icon: Phone,   desc: 'Phone number, ICCID, or IMSI reported' },
  { key: 'battery',      label: 'Battery',           icon: Battery, desc: 'Battery level is being reported' },
  { key: 'android',      label: 'Android Info',      icon: Cpu,     desc: 'Android version and hardware info' },
  { key: 'mdmMode',      label: 'MDM Mode',          icon: Activity,desc: 'Device is in MDM-managed mode' },
  { key: 'kioskMode',    label: 'Kiosk Mode',        icon: Smartphone, desc: 'Device is locked to single app' },
  { key: 'defaultLauncher', label: 'Default Launcher', icon: Smartphone, desc: 'This app is the default launcher' },
  { key: 'configAssigned', label: 'Config Assigned', icon: Activity,desc: 'A configuration is assigned' },
  { key: 'contacts',     label: 'Contacts Sync',     icon: Users,   desc: 'Contacts have been synced from device' },
  { key: 'callLogs',     label: 'Call Logs Sync',    icon: Phone,   desc: 'Call logs have been synced from device' },
  { key: 'installedApps',label: 'App Reporting',     icon: Smartphone, desc: 'Installed apps have been reported' },
  { key: 'locationHistory', label: 'Location History', icon: Map,   desc: 'GPS location history is being recorded' },
  { key: 'online',       label: 'Online',            icon: Wifi,    desc: 'Device status is ONLINE' },
  { key: 'lastSync',     label: 'Recent Sync',       icon: RefreshCw, desc: 'Device has synced at least once' },
  { key: 'pushCapable',  label: 'Push Commands',     icon: Activity,desc: 'Device can receive remote commands' },
]

// ─── Feature row component ──────────────────────────────────────────────
function FeatureRow({ label, value, icon: Icon }: { label: string; value: boolean; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-700 flex-1">{label}</span>
      {value ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      )}
    </div>
  )
}

// ─── Features badge (summary row) ──────────────────────────────────────
function FeaturesBadge({ features }: { features?: DeviceFeatures }) {
  if (!features) return <span className="text-xs text-gray-400">—</span>

  const working = Object.values(features).filter(Boolean).length
  const total = Object.keys(features).length
  const pct = Math.round((working / total) * 100)

  let color = 'bg-red-100 text-red-700'
  if (pct >= 80) color = 'bg-green-100 text-green-700'
  else if (pct >= 50) color = 'bg-yellow-100 text-yellow-700'

  return (
    <span className={`badge text-xs font-medium ${color}`}>
      {working}/{total} ({pct}%)
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function DevicesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedDevice, setExpandedDevice] = useState<number | null>(null)
  const [featuresMap, setFeaturesMap] = useState<Record<number, DeviceFeatures>>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', page, search],
    queryFn: () => api.get(`/devices?page=${page}&size=20${search ? `&search=${encodeURIComponent(search)}` : ''}`),
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

  // ── Fetch features for visible devices ─────────────────────────────
  useEffect(() => {
    if (devices.length === 0) return
    const ids = devices.map(d => d.id)
    
    api.post('/devices/features/batch', { ids })
      .then(res => {
        const raw = res.data?.data?.features ?? {}
        const mapped: Record<number, DeviceFeatures> = {}
        for (const [key, val] of Object.entries(raw)) {
          mapped[Number(key)] = val as DeviceFeatures
        }
        setFeaturesMap(mapped)
      })
      .catch((err: any) => console.warn('Failed to fetch device features:', err?.message || err))
  }, [devices])

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Features</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devices.map(d => {
                  const features = featuresMap[d.id]
                  const isExpanded = expandedDevice === d.id
                  return (
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
                        <div className="flex items-center gap-2">
                          <FeaturesBadge features={features} />
                          {d.lat != null && d.lon != null && (
                            <a href={`https://maps.google.com/?q=${d.lat},${d.lon}`}
                              target="_blank" rel="noreferrer"
                              className="text-primary-600 hover:text-primary-700 transition-colors"
                              title="Open in Google Maps">
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setExpandedDevice(isExpanded ? null : d.id)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            title={isExpanded ? 'Hide features' : 'Show feature details'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded feature details row */}
        {expandedDevice !== null && featuresMap[expandedDevice] && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">
                Feature Status — Device #{expandedDevice}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
              {FEATURE_DEFS.map(fd => (
                <FeatureRow
                  key={fd.key}
                  label={fd.label}
                  value={featuresMap[expandedDevice]?.[fd.key] ?? false}
                  icon={fd.icon}
                />
              ))}
            </div>
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
