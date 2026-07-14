import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Configuration } from '../types'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'

type FormState = Partial<Configuration>

function Toggle({ label, value, onChange }: {
  label: string
  value?: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors
          ${value ? 'bg-primary-600' : 'bg-gray-200'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow mt-0.5 transition-transform
          ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function ConfigDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>({})

  const { data, isLoading } = useQuery({
    queryKey: ['configuration', id],
    queryFn: () => api.get(`/configurations/${id}`),
  })

  useEffect(() => {
    if (data?.data?.data) setForm(data.data.data)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (body: object) => api.put(`/configurations/${id}`, body),
    onSuccess: () => {
      toast.success('Configuration saved')
      qc.invalidateQueries({ queryKey: ['configuration', id] })
      qc.invalidateQueries({ queryKey: ['configurations'] })
    },
    onError: () => toast.error('Save failed'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  )

  const set = (key: keyof FormState, val: unknown) =>
    setForm(f => ({ ...f, [key]: val }))

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/configurations" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{form.name || 'Configuration'}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Settings</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input className="input" value={form.name ?? ''} onChange={e => set('name', e.target.value)} required />
            </Field>
            <Field label="Description">
              <input className="input" value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            </Field>
            <Field label="Background Color">
              <input className="input" value={form.backgroundColor ?? ''} placeholder="#1a1a2e"
                onChange={e => set('backgroundColor', e.target.value)} />
            </Field>
            <Field label="Text Color">
              <input className="input" value={form.textColor ?? ''} placeholder="#ffffff"
                onChange={e => set('textColor', e.target.value)} />
            </Field>
            <Field label="Icon Size (px)">
              <input className="input" type="number" value={form.iconSize ?? 100}
                onChange={e => set('iconSize', parseInt(e.target.value))} />
            </Field>
            <Field label="Title Display">
              <select className="input" value={form.title ?? ''}
                onChange={e => set('title', e.target.value)}>
                <option value="">None</option>
                <option value="deviceId">Device ID</option>
                <option value="description">Description</option>
                <option value="imei">IMEI</option>
                <option value="serialNumber">Serial Number</option>
              </select>
            </Field>
            <Field label="Password Mode">
              <select className="input" value={form.passwordMode ?? ''}
                onChange={e => set('passwordMode', e.target.value)}>
                <option value="">Default</option>
                <option value="present">Present</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="strong">Strong</option>
              </select>
            </Field>
            <Field label="Timezone">
              <input className="input" value={form.timeZone ?? ''} placeholder="e.g. America/New_York"
                onChange={e => set('timeZone', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Connectivity */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Connectivity</h2>
          <div className="grid sm:grid-cols-2 gap-x-8">
            <Toggle label="Enable GPS"         value={form.gps}        onChange={v => set('gps', v)} />
            <Toggle label="Enable Bluetooth"   value={form.bluetooth}  onChange={v => set('bluetooth', v)} />
            <Toggle label="Enable WiFi"        value={form.wifi}       onChange={v => set('wifi', v)} />
            <Toggle label="Enable Mobile Data" value={form.mobileData} onChange={v => set('mobileData', v)} />
            <Toggle label="Disable Location"   value={form.disableLocation} onChange={v => set('disableLocation', v)} />
          </div>
        </div>

        {/* Kiosk */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Kiosk Mode</h2>
          <Toggle label="Enable Kiosk Mode" value={form.kioskMode} onChange={v => set('kioskMode', v)} />
          {form.kioskMode && (
            <div className="mt-4 grid sm:grid-cols-2 gap-x-8 border-t border-gray-100 pt-4">
              <Toggle label="Block Home Button"         value={form.kioskHome}          onChange={v => set('kioskHome', v)} />
              <Toggle label="Block Recents"             value={form.kioskRecents}       onChange={v => set('kioskRecents', v)} />
              <Toggle label="Block Notifications"       value={form.kioskNotifications} onChange={v => set('kioskNotifications', v)} />
              <Toggle label="Block System Info"         value={form.kioskSystemInfo}    onChange={v => set('kioskSystemInfo', v)} />
              <Toggle label="Block Keyguard"            value={form.kioskKeyguard}      onChange={v => set('kioskKeyguard', v)} />
              <Toggle label="Lock Physical Buttons"     value={form.kioskLockButtons}   onChange={v => set('kioskLockButtons', v)} />
            </div>
          )}
        </div>

        {/* Display */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Display & Security</h2>
          <div className="grid sm:grid-cols-2 gap-x-8">
            <Toggle label="Lock Status Bar"      value={form.lockStatusBar}     onChange={v => set('lockStatusBar', v)} />
            <Toggle label="Lock Safe Settings"   value={form.lockSafeSettings}  onChange={v => set('lockSafeSettings', v)} />
            <Toggle label="Permissive Mode"      value={form.permissive}        onChange={v => set('permissive', v)} />
            <Toggle label="Disable Screenshots"  value={form.disableScreenshots} onChange={v => set('disableScreenshots', v)} />
            <Toggle label="Show WiFi Status"     value={form.showWifi}          onChange={v => set('showWifi', v)} />
            <Toggle label="Display Status Bar"   value={form.displayStatus}     onChange={v => set('displayStatus', v)} />
          </div>
        </div>

        {/* Push */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Push & Updates</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Push Mode">
              <select className="input" value={form.pushOptions ?? 'mqttWorker'}
                onChange={e => set('pushOptions', e.target.value)}>
                <option value="mqttWorker">MQTT Worker</option>
                <option value="mqttAlarm">MQTT Alarm</option>
                <option value="polling">Long Polling</option>
              </select>
            </Field>
            <Field label="Keepalive (sec)">
              <input className="input" type="number" value={form.keepaliveTime ?? 300}
                onChange={e => set('keepaliveTime', parseInt(e.target.value))} />
            </Field>
            <Field label="System Update Type">
              <select className="input" value={form.systemUpdateType ?? 0}
                onChange={e => set('systemUpdateType', parseInt(e.target.value))}>
                <option value={0}>Default</option>
                <option value={1}>Instant</option>
                <option value={2}>Scheduled</option>
                <option value={3}>Manual</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Custom */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Custom Fields</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Custom 1">
              <input className="input" value={form.custom1 ?? ''}
                onChange={e => set('custom1', e.target.value)} />
            </Field>
            <Field label="Custom 2">
              <input className="input" value={form.custom2 ?? ''}
                onChange={e => set('custom2', e.target.value)} />
            </Field>
            <Field label="Custom 3">
              <input className="input" value={form.custom3 ?? ''}
                onChange={e => set('custom3', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/configurations" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
