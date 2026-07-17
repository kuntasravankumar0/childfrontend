import { Shield, Smartphone, MapPin, Bell, Wifi, Clock, Globe, Monitor, CheckCircle2 } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'MDM Runs in Background',
    description: 'The MDM agent operates silently in the background without interfering with normal device usage. Users can freely use all apps, browse the web, make calls, and access settings.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Smartphone,
    title: 'Full User Control',
    description: 'Users have complete control over the device. The launcher works like a normal app — it can be minimized, closed, or run in background. No restrictions on app usage.',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    icon: Bell,
    title: 'Silent Data Sync',
    description: 'Contacts, call logs, and device info sync automatically to the server every 30 minutes via a foreground service — like Chrome downloads. No user interaction needed.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: MapPin,
    title: 'GPS Location Tracking',
    description: 'Device GPS location is collected and reported to the server. Admins can view live location on the map and set up geofence alerts. Enable GPS in device settings for best results.',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    icon: Monitor,
    title: 'Managed Launcher',
    description: 'App icons defined by the admin appear in the launcher grid. Only approved apps (showIcon=true) are visible. This is configured in Configuration → Applications.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    icon: Globe,
    title: 'Remote Commands',
    description: 'Admins can send push commands (reboot, lock, camera capture, APK install) to the device. Commands are processed even when the launcher is in the background.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    icon: Wifi,
    title: 'NDOA Network Detection',
    description: 'The agent automatically detects network connectivity and adjusts sync behavior. Data is queued when offline and synced when connection is restored.',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    icon: Clock,
    title: 'Boot & Persistent Service',
    description: 'The sync service starts automatically on device boot and runs persistently in the background. Android\'s foreground service priority keeps it alive even under memory pressure.',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
]

const statusItems = [
  { label: 'Kiosk Mode', status: '✅ Working', detail: 'Lock device to a single app via push command. Configure in Device → Push Command → Lock.' },
  { label: 'Managed Launcher', status: '✅ Working', detail: 'App icons defined by admin appear in the launcher. Blocklist apps are hidden. Configure in Configuration → Applications.' },
  { label: 'GPS / Location', status: '✅ Working', detail: 'GPS location is reported with device info. View on Device Detail → Locations tab. Enable GPS in device settings.' },
  { label: 'Background Mode', status: '✅ Active', detail: 'MDM runs as a foreground service. Sync service is persistent. Launcher minimizes like a normal app.' },
]

export default function BackgroundAgentMode() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-600" />
          Background Agent Mode
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          MDM runs silently in the background while users retain full control of the device — like Chrome downloads or WhatsApp.
        </p>
      </div>

      {/* Status Cards */}
      <div className="border border-green-200 bg-green-50/50 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4" /> System Status
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {statusItems.map(item => (
            <div key={item.label} className="bg-white rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                <span className="text-xs font-medium text-green-700">{item.status}</span>
              </div>
              <p className="text-xs text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map(f => (
          <div key={f.title} className={`${f.bgColor} rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-shadow`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${f.bgColor} flex items-center justify-center flex-shrink-0`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{f.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">How It Works</h2>
        <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
          <li><strong>Install APK</strong> on the device — it registers as the default launcher and device admin.</li>
          <li><strong>Background sync</strong> starts automatically. Contacts, call logs, and GPS are synced every 30 minutes.</li>
          <li><strong>Launcher minimizes</strong> on Back/Home press — the device works normally for the user.</li>
          <li><strong>Admins monitor</strong> via the web dashboard — view location, contacts, calls, send push commands.</li>
          <li><strong>No user interruption</strong> — the agent runs silently. Users don't see sync operations or background activity.</li>
        </ol>
      </div>
    </div>
  )
}
