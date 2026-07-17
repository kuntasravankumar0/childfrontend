import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStorageQuery } from '../hooks/useStorageQuery'
import api from '../lib/api'
import { Device, Configuration, DeviceLog, DeviceLocation, DeviceContact, DeviceNotificationItem, CallLogItem, Geofence } from '../types'
import {
  ArrowLeft, Battery, Wifi, MapPin, RefreshCw,
  Bell, Terminal, Info, Package, Users, Phone, PhoneIncoming,
  PhoneOutgoing, PhoneMissed, Mail, Smartphone, Activity, Navigation,
  Search, X, Camera, Mic, Circle, Plus, Trash2, ToggleLeft, ToggleRight,
  ExternalLink, Download
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import ErrorBoundary from '../components/ErrorBoundary'

// ─── Severity map ──────────────────────────────────────────────────────────
const SEV: Record<number, { label: string; cls: string }> = {
  1: { label: 'ERROR',   cls: 'badge-red'    },
  2: { label: 'WARN',    cls: 'badge-yellow' },
  3: { label: 'INFO',    cls: 'badge-blue'   },
  4: { label: 'DEBUG',   cls: 'badge-gray'   },
  5: { label: 'VERBOSE', cls: 'badge-gray'   },
}

// ─── Call log helpers ──────────────────────────────────────────────────────
const CALL_ICONS: Record<string, React.ElementType> = {
  INCOMING: PhoneIncoming, OUTGOING: PhoneOutgoing, MISSED: PhoneMissed, REJECTED: PhoneMissed,
}
const CALL_COLORS: Record<string, string> = {
  INCOMING: 'text-green-600', OUTGOING: 'text-blue-600', MISSED: 'text-red-600', REJECTED: 'text-red-600',
}
const CALL_BADGES: Record<string, string> = {
  INCOMING: 'badge-green', OUTGOING: 'badge-blue', MISSED: 'badge-red', REJECTED: 'badge-red',
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60); const s = sec % 60
  return `${m}m ${s}s`
}

// ─── Components ────────────────────────────────────────────────────────────
type Tab = 'info' | 'apps' | 'contacts' | 'calls' | 'notifications' | 'logs' | 'locations' | 'geofences' | 'media'

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

// ─── Live Location Map Component (with geofence overlays) ──────────────────
function LocationMap({ locations, liveLat, liveLon, geofences, onMapClick, height = '400px' }: {
  locations: DeviceLocation[]
  liveLat?: number | null
  liveLon?: number | null
  geofences?: Geofence[]
  onMapClick?: (lat: number, lng: number) => void
  height?: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    if (onMapClick) map.on('click', (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng))
    mapInstance.current = map
    markersLayer.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    const layer = markersLayer.current
    if (!map || !layer) return
    layer.clearLayers()
    const points: [number, number][] = []

    // Location history markers
    locations.forEach((loc, i) => {
      const isLatest = i === 0
      const color = isLatest ? '#ef4444' : '#3b82f6'
      const size = isLatest ? 14 : 10
      const markerIcon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      })
      const marker = L.marker([loc.lat, loc.lon], { icon: markerIcon })
      marker.bindPopup(`<div style="font-family:sans-serif;font-size:12px"><strong style="color:${color}">${isLatest ? '📍 Latest' : `#${i + 1}`}</strong><br/>${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}<br/><span style="color:#666">${format(new Date(loc.ts), 'MMM dd, yyyy HH:mm:ss')}</span></div>`)
      layer.addLayer(marker)
      points.push([loc.lat, loc.lon])
    })

    // Geofence circles
    if (geofences) geofences.forEach(fence => {
      const color = fence.isInside ? '#22c55e' : (fence.active ? '#3b82f6' : '#9ca3af')
      const circle = L.circle([fence.latitude, fence.longitude], {
        radius: fence.radius,
        color,
        fillColor: fence.isInside ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.1)',
        fillOpacity: 0.3, weight: 2, dashArray: fence.active ? '' : '5, 10',
      })
      circle.bindPopup(`<div style="font-family:sans-serif;font-size:12px"><strong>${fence.name}</strong><br/>${fence.isInside ? '✅ Device INSIDE' : '⬜ Device OUTSIDE'}<br/>Radius: ${fence.radius}m</div>`)
      layer.addLayer(circle)
      points.push([fence.latitude, fence.longitude])
    })

    // Live location
    if (liveLat != null && liveLon != null) {
      const hasExact = locations.some(l => Math.abs(l.lat - liveLat) < 0.001 && Math.abs(l.lon - liveLon) < 0.001)
      if (!hasExact) {
        const liveIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(239,68,68,0.5);"></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        })
        const marker = L.marker([liveLat, liveLon], { icon: liveIcon })
        marker.bindPopup(`<div style="font-family:sans-serif;font-size:12px"><strong style="color:#ef4444">🔴 Live Location</strong><br/>${liveLat.toFixed(6)}, ${liveLon.toFixed(6)}</div>`)
        layer.addLayer(marker)
        points.push([liveLat, liveLon])
      }
    }

    // Path line
    if (points.length > 1) L.polyline(points.reverse(), { color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '5, 8' }).addTo(layer)
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [locations, liveLat, liveLon, geofences])

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '0.75rem' }} />
}

// ─── Geofence Create Form ─────────────────────────────────────────────────
function GeofenceForm({ lat, lng, onSave, onCancel }: {
  lat: number; lng: number; onSave: (data: Partial<Geofence>) => void; onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [radius, setRadius] = useState('100')
  const [alertType, setAlertType] = useState<'ENTER' | 'EXIT' | 'BOTH'>('BOTH')
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
      <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Geofence</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Latitude</label>
          <input className="input text-sm" value={lat.toFixed(6)} disabled />
        </div>
        <div>
          <label className="text-xs text-gray-500">Longitude</label>
          <input className="input text-sm" value={lng.toFixed(6)} disabled />
        </div>
        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input className="input text-sm" placeholder="Home, Office, etc." value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Radius (m)</label>
          <input className="input text-sm" type="number" min="10" max="50000" value={radius} onChange={e => setRadius(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Alert on</label>
          <select className="input text-sm" value={alertType} onChange={e => setAlertType(e.target.value as any)}>
            <option value="BOTH">Entry + Exit</option>
            <option value="ENTER">Entry only</option>
            <option value="EXIT">Exit only</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
        <button onClick={() => onSave({ name, latitude: lat, longitude: lng, radius: Number(radius), alertType })} disabled={!name} className="btn-primary text-xs">Create</button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')
  const [configId, setConfigId] = useState('')
  const [pushType, setPushType] = useState('configUpdated')
  const [callSearch, setCallSearch] = useState('')
  const [callTypeFilter, setCallTypeFilter] = useState('ALL')
  const [callDateFrom, setCallDateFrom] = useState('')
  const [callDateTo, setCallDateTo] = useState('')
  const [notifPage, setNotifPage] = useState(0)
  const [newGeofenceLat, setNewGeofenceLat] = useState<number | null>(null)
  const [newGeofenceLng, setNewGeofenceLng] = useState<number | null>(null)

  // ── Queries ──────────────────────────────────────────────────────
  const { data: deviceRes, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => api.get(`/devices/${id}`),
    refetchInterval: 60_000,
  })

  const { data: configsRes } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.get('/configurations'),
  })

  const { data: locsRes, refetch: refetchLocs } = useQuery({
    queryKey: ['device-locations', id],
    queryFn: () => api.get(`/devices/${id}/locations`),
    refetchInterval: tab === 'locations' || tab === 'geofences' ? 60_000 : false,
  })

  const { data: geofencesRes, refetch: refetchGeofences } = useQuery({
    queryKey: ['device-geofences', id],
    queryFn: () => api.get(`/devices/${id}/geofences`),
    refetchInterval: tab === 'geofences' ? 30_000 : false,
  })

  const { data: logsRes } = useStorageQuery({
    queryKey: ['device-logs', id!],
    fetcher: () => api.get(`/devices/${id}/logs?page=0&size=200`),
    enabled: tab === 'logs', staleSeconds: 60,
  })

  const { data: appsRes } = useStorageQuery({
    queryKey: ['device-apps', id!],
    fetcher: () => api.get(`/devices/${id}/apps`),
    enabled: tab === 'apps', staleSeconds: 120,
  })

  const [contactsPage, setContactsPage] = useState(0)
  const { data: contactsRes } = useStorageQuery({
    queryKey: ['device-contacts', id!, String(contactsPage)],
    fetcher: () => api.get(`/devices/${id}/data/contacts?page=${contactsPage}&size=200`),
    enabled: tab === 'contacts', staleSeconds: 120,
  })

  const [callsPage, setCallsPage] = useState(0)
  const { data: callsRes } = useStorageQuery({
    queryKey: ['device-calls', id!, String(callsPage), callSearch, callTypeFilter, callDateFrom, callDateTo],
    fetcher: () => {
      const params = new URLSearchParams({ page: String(callsPage), size: '100' })
      if (callSearch) params.set('search', callSearch)
      if (callTypeFilter !== 'ALL') params.set('type', callTypeFilter)
      if (callDateFrom) params.set('dateFrom', String(new Date(callDateFrom).getTime()))
      if (callDateTo) params.set('dateTo', String(new Date(callDateTo).getTime() + 86400000))
      return api.get(`/devices/${id}/data/calls?${params}`)
    },
    enabled: tab === 'calls', staleSeconds: 120,
  })

  const { data: notifsRes } = useStorageQuery({
    queryKey: ['device-notifications', id!, String(notifPage)],
    fetcher: () => api.get(`/devices/${id}/data/notifications?page=${notifPage}&size=100`),
    enabled: tab === 'notifications', staleSeconds: 120,
  })

  const { data: countsRes } = useStorageQuery({
    queryKey: ['device-data-counts', id!],
    fetcher: () => api.get(`/devices/${id}/data/counts`),
    staleSeconds: 300,
  })

  // ── Mutations ────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (body: object) => api.put(`/devices/${id}`, body),
    onSuccess: () => { toast.success('Device updated'); qc.invalidateQueries({ queryKey: ['device', id] }) },
    onError: () => toast.error('Update failed'),
  })

  const pushMutation = useMutation({
    mutationFn: (body: object) => api.post(`/devices/${id}/push`, body),
    onSuccess: () => toast.success('Push queued'),
    onError: () => toast.error('Push failed'),
  })

  const deleteNotifMutation = useMutation({
    mutationFn: (notifId: number) => api.delete(`/devices/${id}/data/notifications/${notifId}`),
    onSuccess: () => { toast.success('Notification deleted'); qc.invalidateQueries({ queryKey: ['device-notifications', id] }); qc.invalidateQueries({ queryKey: ['device-data-counts', id] }) },
    onError: () => toast.error('Failed to delete notification'),
  })

  // Geofence mutations
  const createGeofenceMutation = useMutation({
    mutationFn: (data: Partial<Geofence>) => api.post(`/devices/${id}/geofences`, data),
    onSuccess: () => { toast.success('Geofence created'); qc.invalidateQueries({ queryKey: ['device-geofences', id] }); setNewGeofenceLat(null); setNewGeofenceLng(null) },
    onError: () => toast.error('Failed to create geofence'),
  })

  const deleteGeofenceMutation = useMutation({
    mutationFn: (fenceId: number) => api.delete(`/devices/${id}/geofences/${fenceId}`),
    onSuccess: () => { toast.success('Geofence deleted'); qc.invalidateQueries({ queryKey: ['device-geofences', id] }) },
    onError: () => toast.error('Failed to delete geofence'),
  })

  const toggleGeofenceMutation = useMutation({
    mutationFn: ({ fenceId, active }: { fenceId: number; active: boolean }) => api.put(`/devices/${id}/geofences/${fenceId}`, { active }),
    onSuccess: () => { toast.success('Geofence updated'); qc.invalidateQueries({ queryKey: ['device-geofences', id] }) },
    onError: () => toast.error('Failed to update geofence'),
  })

  // ── Data ─────────────────────────────────────────────────────────
  const device: Device = deviceRes?.data?.data
  const configs: Configuration[] = configsRes?.data?.data ?? []
  const locations: DeviceLocation[] = locsRes?.data?.data ?? []
  const geofences: Geofence[] = geofencesRes?.data?.data ?? []
  const installedApps: any[] = (appsRes ?? []) as any[]
  const contactsData = (contactsRes ?? { items: [], total: 0 }) as { items?: DeviceContact[]; total?: number }
  const contacts = contactsData.items ?? []
  const contactsTotal = contactsData.total ?? 0
  const callsData = (callsRes ?? { items: [], total: 0, page: 0, pages: 0 }) as { items?: CallLogItem[]; total?: number; page?: number; pages?: number }
  const callLogs = callsData.items ?? []
  const callsTotal = callsData.total ?? 0
  const notifsData = (notifsRes ?? { items: [], total: 0, page: 0, pages: 0 }) as { items?: DeviceNotificationItem[]; total?: number; page?: number; pages?: number }
  const notifications = notifsData.items ?? []
  const logs: DeviceLog[] = (logsRes ?? []) as DeviceLog[]
  const dataCountsMap: Record<string, number> = (countsRes ?? {}) as Record<string, number>

  useEffect(() => { if (device?.configId) setConfigId(String(device.configId)) }, [device])

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  )
  if (!device) return <div className="text-center py-20 text-gray-400">Device not found</div>

  const TABS = [
    { key: 'info'          as Tab, label: 'Info',          icon: Info },
    { key: 'apps'          as Tab, label: `Apps (${installedApps.length})`,      icon: Package },
    { key: 'contacts'      as Tab, label: `Contacts (${dataCountsMap.contacts ?? 0})`, icon: Users },
    { key: 'calls'         as Tab, label: `Calls (${callsTotal ?? dataCountsMap.callLogs ?? 0})`, icon: Phone },
    { key: 'notifications' as Tab, label: `Notifs (${dataCountsMap.notifications ?? 0})`, icon: Bell },
    { key: 'logs'          as Tab, label: 'Logs',          icon: Terminal },
    { key: 'locations'     as Tab, label: 'Locations',     icon: Navigation },
    { key: 'geofences'     as Tab, label: `Geo (${geofences.length})`, icon: Circle },
    { key: 'media'         as Tab, label: 'Media',         icon: Camera },
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{device.number}</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ID: {id}</span>
          </div>
          <p className="text-sm text-gray-500">{device.model || 'Unknown model'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(device.status)}
          {device.lastSync && (
            <span className="text-xs text-gray-400">Synced {formatDistanceToNow(new Date(device.lastSync), { addSuffix: true })}</span>
          )}
          <button onClick={() => { qc.invalidateQueries({ queryKey: ['device', id] }); refetchLocs(); refetchGeofences() }} className="btn-secondary text-sm p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Live tracking mini-map ── */}
      {device.lat != null && device.lon != null && tab !== 'locations' && tab !== 'geofences' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Live Tracking
            </span>
            <span className="text-xs text-gray-400">{device.lat.toFixed(4)}, {device.lon.toFixed(4)}</span>
          </div>
          <LocationMap locations={locations.slice(0, 10)} liveLat={device.lat} liveLon={device.lon} geofences={geofences} height="220px" />
        </div>
      )}

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <Battery className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Battery</p>
            <p className="font-semibold text-sm">{device.batteryLevel != null ? `${device.batteryLevel}%` : '—'}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <Wifi className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Android</p>
            <p className="font-semibold text-sm">{device.androidVersion || '—'}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-semibold text-xs truncate">{device.lat != null ? `${device.lat.toFixed(4)}, ${device.lon!.toFixed(4)}` : '—'}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <Activity className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Last Sync</p>
            <p className="font-semibold text-xs">{device.lastSync ? formatDistanceToNow(new Date(device.lastSync), { addSuffix: true }) : 'Never'}</p>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="card p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Assign Configuration</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={configId} onChange={e => setConfigId(e.target.value)}>
              <option value="">— Select —</option>
              {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => updateMutation.mutate({ configId })} className="btn-primary text-sm">Apply</button>
          </div>
          {device.configId && (
            <p className="text-xs text-gray-400 mt-1">Current: {configs.find(c => c.id === device.configId)?.name ?? `#${device.configId}`}</p>
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
              <option value="captureCamera">Capture Camera</option>
              <option value="recordAudio">Record Audio (30s)</option>
              <option value="installApk">Install APK (requires URL)</option>
              <option value="uninstallApp">Uninstall App (requires pkg)</option>
            </select>
            <button onClick={() => {
              if (pushType === 'installApk') {
                const url = window.prompt('Enter APK download URL:');
                if (url) pushMutation.mutate({ messageType: pushType, payload: url });
              } else if (pushType === 'uninstallApp') {
                const pkg = window.prompt('Enter package name to uninstall:');
                if (pkg) pushMutation.mutate({ messageType: pushType, payload: pkg });
              } else {
                pushMutation.mutate({ messageType: pushType });
              }
            }} disabled={pushMutation.isPending} className="btn-primary text-sm">
              <Bell className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* ── Media Controls (Camera / Audio / APK Install) ── */}
      <div className="card p-5 grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label flex items-center gap-1.5"><Camera className="w-4 h-4" /> Remote Camera Capture</label>
          <p className="text-xs text-gray-400 mb-2">Captures photo on device → uploads to Google Drive.</p>
          <button onClick={() => pushMutation.mutate({ messageType: 'captureCamera' })} disabled={pushMutation.isPending}
            className="btn-primary text-sm w-full flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> Capture Camera
          </button>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Mic className="w-4 h-4" /> Remote Audio Recording</label>
          <p className="text-xs text-gray-400 mb-2">Records 30s audio on device → uploads to Google Drive.</p>
          <button onClick={() => pushMutation.mutate({ messageType: 'recordAudio' })} disabled={pushMutation.isPending}
            className="btn-primary text-sm w-full flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" /> Record Audio (30s)
          </button>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Package className="w-4 h-4" /> Silent MDM Install</label>
          <p className="text-xs text-gray-400 mb-2">Download &amp; install APK remotely via push command.</p>
          <button onClick={() => {
            const url = window.prompt('Enter APK download URL:');
            if (url) pushMutation.mutate({ messageType: 'installApk', payload: url });
          }} disabled={pushMutation.isPending}
            className="btn-primary text-sm w-full flex items-center justify-center gap-2">
            <Package className="w-4 h-4" /> Install APK
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setNewGeofenceLat(null) }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-primary-500 text-primary-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ══════ INFO TAB ══════ */}
          {tab === 'info' && (
            <div className="grid sm:grid-cols-2 gap-x-10">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Hardware</p>
                <Row label="Device ID" value={device.number} />
                <Row label="Model" value={device.model} /><Row label="Serial" value={device.serial} /><Row label="CPU" value={device.cpu} />
                <Row label="Android Version" value={device.androidVersion} /><Row label="Launcher Package" value={device.launcherPackage} />
                <Row label="Kiosk Mode" value={device.kioskMode ? 'Yes' : 'No'} /><Row label="MDM Mode" value={device.mdmMode ? 'Yes' : 'No'} />
                <Row label="Default Launcher" value={device.defaultLauncher ? 'Yes' : 'No'} />
                <Row label="Battery" value={device.batteryLevel != null ? `${device.batteryLevel}% (${device.batteryCharging ?? 'discharging'})` : undefined} />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4 flex items-center gap-1"><Package className="w-3 h-3" /> App Allowlist / Blocklist</p>
                <Row label="Multi App Mode" value={device.kioskMode ? 'Approved apps only' : 'All apps visible'} />
                <p className="text-xs text-gray-500 mt-1">Configure which apps appear on the launcher via Configuration → Applications. Apps with "Show icon"=true appear; others are hidden.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Wifi className="w-3 h-3" /> Network / SIM</p>
                <Row label="IMEI" value={device.imei} /><Row label="IMEI 2" value={device.imei2} /><Row label="Phone" value={device.phone} />
                <Row label="Phone 2" value={device.phone2} /><Row label="ICCID" value={device.iccid} /><Row label="ICCID 2" value={device.iccid2} />
                <Row label="IMSI" value={device.imsi || '—'} /><Row label="IP Address" value={device.ipAddress} /><Row label="External IP" value={device.externalIp} />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                <Row label="Latitude" value={device.lat} /><Row label="Longitude" value={device.lon} />
                {device.lat != null && (
                  <a href={`https://maps.google.com/?q=${device.lat},${device.lon}`} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> Open in Google Maps
                  </a>
                )}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4 flex items-center gap-1"><Package className="w-3 h-3" /> Custom Fields</p>
                <Row label="Custom 1" value={device.custom1} /><Row label="Custom 2" value={device.custom2} /><Row label="Custom 3" value={device.custom3} />
              </div>
            </div>
          )}

          {/* ══════ APPS TAB ══════ */}
          {tab === 'apps' && (installedApps.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No app data yet</p></div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-3">{installedApps.length} apps reported</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {installedApps.map((app: any) => (
                  <div key={app.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${app.installed ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Smartphone className={`w-4 h-4 ${app.installed ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{app.pkg}</p>
                      <p className="text-xs text-gray-500 truncate">v{app.version || '—'} {app.name ? `· ${app.name}` : ''}</p>
                    </div>
                    <span className={`text-xs ${app.installed ? 'badge-green' : 'badge-red'}`}>{app.installed ? 'Yes' : 'No'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ══════ CONTACTS TAB ══════ */}
          {tab === 'contacts' && (
            <ErrorBoundary>
              {contacts.length === 0 ? (
                <div className="text-center py-10 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No contacts synced yet</p></div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-xs text-gray-400 mb-3">{contacts.length} contacts</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white"><tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">{contacts.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{c.name || '—'}</td>
                          <td className="px-3 py-2"><span className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" /> {c.phone || '—'}</span></td>
                          <td className="px-3 py-2"><span className="badge-blue text-xs">{c.phoneType || '—'}</span></td>
                          <td className="px-3 py-2 text-gray-600">{c.email ? <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span> : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          )}

          {/* ══════ CALL LOGS TAB ══════ */}
          {tab === 'calls' && (
            <ErrorBoundary>
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <Search className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by phone number..." value={callSearch}
                  onChange={e => { setCallSearch(e.target.value); setCallsPage(0); }} className="input flex-1 min-w-[160px] text-sm" />
                <select value={callTypeFilter} onChange={e => { setCallTypeFilter(e.target.value); setCallsPage(0); }} className="input w-auto text-sm">
                  <option value="ALL">All Types</option><option value="INCOMING">Incoming</option><option value="OUTGOING">Outgoing</option><option value="MISSED">Missed</option><option value="REJECTED">Rejected</option>
                </select>
                <input type="date" value={callDateFrom} onChange={e => { setCallDateFrom(e.target.value); setCallsPage(0); }} className="input w-auto text-sm" />
                <span className="text-xs text-gray-400">→</span>
                <input type="date" value={callDateTo} onChange={e => { setCallDateTo(e.target.value); setCallsPage(0); }} className="input w-auto text-sm" />
                {(callSearch || callTypeFilter !== 'ALL' || callDateFrom || callDateTo) && (
                  <button onClick={() => { setCallSearch(''); setCallTypeFilter('ALL'); setCallDateFrom(''); setCallDateTo(''); setCallsPage(0); }} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
                )}
              </div>
              {(callsData as any)?.total > 0 && <p className="text-xs text-gray-400 mb-3">{callsTotal.toLocaleString()} calls — Page {callsPage + 1} of {callsData.pages || 1}</p>}
              {callLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400"><Phone className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No call logs yet</p></div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-1">{callLogs.map(log => {
                    const Icon = CALL_ICONS[log.callType] || Phone; const color = CALL_COLORS[log.callType] || 'text-gray-600'
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-gray-900 text-sm">{log.contactName || log.phoneNumber || 'Unknown'}</span><span className={CALL_BADGES[log.callType] || 'badge-gray'}>{log.callType}</span></div>
                          {log.phoneNumber && log.contactName && <p className="text-xs text-gray-500">{log.phoneNumber}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500">{format(new Date(log.callDate), 'MMM dd, HH:mm')}</p>
                          <p className="text-xs text-gray-400">{formatDuration(log.durationSec)}</p>
                        </div>
                      </div>
                    )
                  })}</div>
                  <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-50 mt-3">
                    <button onClick={() => setCallsPage(p => Math.max(0, p - 1))} disabled={callsPage === 0} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">← Previous</button>
                    <span className="text-xs text-gray-500">Page {callsPage + 1} of {callsData.pages || 1}</span>
                    <button onClick={() => setCallsPage(p => p + 1)} disabled={callsPage >= (callsData.pages || 1) - 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Next →</button>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          )}

          {/* ══════ NOTIFICATIONS TAB ══════ */}
          {tab === 'notifications' && (
            <>
              {(notifsData.total ?? 0) > 0 && <p className="text-xs text-gray-400 mb-3">{(notifsData.total ?? 0).toLocaleString()} notifications — Page {notifPage + 1} of {notifsData.pages || 1}</p>}
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400"><Bell className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No notifications</p></div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">{notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50 group">
                      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Bell className="w-4 h-4 text-primary-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium text-gray-900">{n.appName || n.packageName}</span><span className="badge-gray text-xs">{n.packageName}</span></div>
                        {n.title && <p className="text-sm font-medium text-gray-800 mt-0.5">{n.title}</p>}
                        {n.text && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.text}</p>}
                        <p className="text-xs text-gray-400 mt-1">{format(new Date(n.receivedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                      </div>
                      <button onClick={() => { if (window.confirm('Delete this notification?')) deleteNotifMutation.mutate(n.id) }} disabled={deleteNotifMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0 mt-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}</div>
                  <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-50 mt-3">
                    <button onClick={() => setNotifPage(p => Math.max(0, p - 1))} disabled={notifPage === 0} className="btn-secondary text-xs px-3 py-1.5">← Previous</button>
                    <span className="text-xs text-gray-500">Page {notifPage + 1} of {notifsData.pages || 1}</span>
                    <button onClick={() => setNotifPage(p => p + 1)} disabled={notifPage >= (notifsData.pages || 1) - 1} className="btn-secondary text-xs px-3 py-1.5">Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════ LOGS TAB ══════ */}
          {tab === 'logs' && (logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><Terminal className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No logs yet</p></div>
          ) : (
            <div className="max-h-96 overflow-y-auto font-mono text-xs space-y-0.5">{logs.map(log => {
              const sev = SEV[log.severity] ?? { label: String(log.severity), cls: 'badge-gray' }
              return (
                <div key={log.id} className="flex gap-2 py-1 border-b border-gray-50 hover:bg-gray-50 px-1 rounded">
                  <span className="text-gray-400 flex-shrink-0 w-32">{format(new Date(log.logTime), 'MM-dd HH:mm:ss')}</span>
                  <span className={`${sev.cls} flex-shrink-0 text-xs`}>{sev.label}</span>
                  {log.tag && <span className="text-gray-500 flex-shrink-0 w-24 truncate">{log.tag}</span>}
                  <span className="text-gray-800 break-all">{log.message}</span>
                </div>
              )
            })}</div>
          ))}

          {/* ══════ LOCATIONS TAB ══════ */}
          {tab === 'locations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary-600" />
                  <p className="text-xs text-gray-400">
                    {locations.length > 0 ? `${locations.length} location records — latest: ${format(new Date(locations[0].ts), 'MMM dd, yyyy HH:mm:ss')}` : 'No location data yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-pulse" /> Live</span>
                  <button onClick={() => refetchLocs()} className="btn-secondary text-xs p-1.5"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {locations.length === 0 ? (
                <div className="text-center py-10 text-gray-400"><MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" /><p className="font-medium">No location history</p><p className="text-xs mt-1">Enable GPS on the device and wait for location updates.</p></div>
              ) : (
                <LocationMap locations={locations} liveLat={device.lat} liveLon={device.lon} geofences={geofences} />
              )}
              {locations.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {locations.slice(0, 20).map((loc, i) => (
                    <div key={loc.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-red-500' : 'bg-blue-400'}`} />
                      <span className="text-gray-400 text-xs w-36 flex-shrink-0">{format(new Date(loc.ts), 'yyyy-MM-dd HH:mm:ss')}</span>
                      <span className="text-gray-700 font-mono text-xs">{loc.lat.toFixed(6)}, {loc.lon.toFixed(6)}</span>
                      <a href={`https://maps.google.com/?q=${loc.lat},${loc.lon}`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs ml-auto flex items-center gap-1"><MapPin className="w-3 h-3" /> Map</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ GEOFENCES TAB ══════ */}
          {tab === 'geofences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{geofences.length} geofence{geofences.length !== 1 ? 's' : ''} configured</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Click on map to create</span>
                  <button onClick={() => refetchGeofences()} className="btn-secondary text-xs p-1.5"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Live map with geofence overlays */}
              <LocationMap locations={locations} liveLat={device.lat} liveLon={device.lon} geofences={geofences}
                onMapClick={(lat, lng) => { setNewGeofenceLat(lat); setNewGeofenceLng(lng) }} />

              {/* Geofence creation form */}
              {newGeofenceLat != null && newGeofenceLng != null && (
                <GeofenceForm lat={newGeofenceLat} lng={newGeofenceLng}
                  onSave={data => createGeofenceMutation.mutate(data)}
                  onCancel={() => { setNewGeofenceLat(null); setNewGeofenceLng(null) }} />
              )}

              {/* Geofence list */}
              {geofences.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Circle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No geofences defined</p>
                  <p className="text-xs mt-1">Click on the map above to create a geofence.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {geofences.map(fence => (
                    <div key={fence.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${fence.isInside ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <Circle className={`w-4 h-4 ${fence.isInside ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{fence.name}</span>
                          <span className={`text-xs ${fence.active ? 'badge-green' : 'badge-gray'}`}>{fence.active ? 'Active' : 'Disabled'}</span>
                          <span className={`text-xs ${fence.isInside ? 'badge-green' : 'badge-gray'}`}>{fence.isInside ? 'Inside' : 'Outside'}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fence.latitude.toFixed(6)}, {fence.longitude.toFixed(6)} · {fence.radius}m radius · Alert: {fence.alertType}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleGeofenceMutation.mutate({ fenceId: fence.id, active: !fence.active })}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" title={fence.active ? 'Disable' : 'Enable'}>
                          {fence.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete geofence "${fence.name}"?`)) deleteGeofenceMutation.mutate(fence.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ MEDIA TAB ══════ */}
          {tab === 'media' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Captured Media from Device
                </p>
                <span className="text-xs text-gray-400">Images &amp; audio uploaded to Google Drive</span>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <p className="font-medium flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> Google Drive Media Links</p>
                <p className="text-xs text-blue-600">
                  Captured photos and audio recordings are uploaded to Google Drive by the device.
                  Use the Google Sheets script to get shareable links. Below are the stored media files
                  accessible via the Spreadsheet's linked Google Drive folder:
                </p>
                <div className="grid gap-2 mt-3">
                  <a href="https://drive.google.com/drive/folders/1UhmOZUwhG_vBoQrdBCJkezlYAlIEnEGwxqMSUi49h2g" target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-blue-100">
                    <Download className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">📁 Media Drive Folder</p>
                      <p className="text-xs text-blue-500">Open in Google Drive to view all captured media</p>
                    </div>
                    <ExternalLink className="w-4 h-4 ml-auto text-blue-400" />
                  </a>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p className="font-medium flex items-center gap-1.5"><Camera className="w-4 h-4" /> How to view captured media</p>
                <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1.5">
                  <li>Use the <strong>Capture Camera</strong> or <strong>Record Audio</strong> button above to send a push command to the device.</li>
                  <li>The device captures the media and uploads it to Google Drive via the Apps Script web app.</li>
                  <li>Media files are organized in the <strong>Media</strong> sheet of the connected Google Spreadsheet.</li>
                  <li>Use the <strong>Google Apps Script</strong> (<code>mdm-sheets-webapp.gs</code>) to retrieve download links and store them in the sheet.</li>
                  <li>The Google Drive folder linked above contains all captured files organized by device ID.</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                  💡 <strong>Tip:</strong> You can expand the Google Apps Script (see <code>script.txt</code>) to automatically generate
                  shareable Drive links and store them back in the spreadsheet for easy reference.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
