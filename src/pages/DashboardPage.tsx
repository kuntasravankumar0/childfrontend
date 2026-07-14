import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Device } from '../types'
import { Smartphone, Wifi, WifiOff, Clock, RefreshCw, Settings2, Package, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280']

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function statusBadge(status: string) {
  const m: Record<string, string> = {
    ONLINE: 'badge-green', ENROLLED: 'badge-yellow',
    PENDING: 'badge-gray', RESET: 'badge-red'
  }
  return <span className={m[status] ?? 'badge-gray'}>{status}</span>
}

export default function DashboardPage() {
  const { data: summaryRes, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary'),
    refetchInterval: 30_000,
  })

  const { data: devicesRes } = useQuery({
    queryKey: ['devices-recent'],
    queryFn: () => api.get('/devices?page=0&size=8'),
    refetchInterval: 30_000,
  })

  const summary = summaryRes?.data?.data
  const devices = summary?.devices ?? {}
  const recentDevices: Device[] = devicesRes?.data?.data?.devices ?? []

  const pieData = summary ? [
    { name: 'Online',  value: devices.online  ?? 0 },
    { name: 'Offline', value: devices.offline ?? 0 },
    { name: 'Pending', value: devices.pending ?? 0 },
    { name: 'Reset',   value: devices.reset   ?? 0 },
  ].filter(d => d.value > 0) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all managed devices</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Devices"   value={devices.total   ?? 0} icon={Smartphone}  color="bg-primary-600" />
            <StatCard label="Online"          value={devices.online  ?? 0} icon={Wifi}         color="bg-green-500"   />
            <StatCard label="Offline"         value={devices.offline ?? 0} icon={WifiOff}      color="bg-red-500"     />
            <StatCard label="Pending"         value={devices.pending ?? 0} icon={Clock}        color="bg-yellow-500"  />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Configurations" value={summary?.configurations ?? 0} icon={Settings2} color="bg-purple-500" />
            <StatCard label="Applications"   value={summary?.applications   ?? 0} icon={Package}   color="bg-blue-500"   />
            <StatCard label="Groups"         value={summary?.groups         ?? 0} icon={Users}      color="bg-orange-500" />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Device Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%"
                     innerRadius={55} outerRadius={80}
                     paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No devices yet
            </div>
          )}
        </div>

        {/* Recent devices */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Devices</h2>
            <Link to="/devices" className="text-sm text-primary-600 hover:underline">View all →</Link>
          </div>
          {recentDevices.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No devices enrolled yet</p>
              <p className="text-xs mt-1">Install the APK on an Android device to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentDevices.map(d => (
                <Link key={d.id} to={`/devices/${d.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.number}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {d.model ?? 'Unknown model'}
                      {d.androidVersion ? ` · Android ${d.androidVersion}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {statusBadge(d.status)}
                    {d.lastSync && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(d.lastSync), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
