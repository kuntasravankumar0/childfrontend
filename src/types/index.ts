export interface User {
  id: number
  login: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

export interface Device {
  id: number
  number: string
  description?: string
  model?: string
  imei?: string
  imei2?: string
  phone?: string
  phone2?: string
  iccid?: string
  iccid2?: string
  imsi?: string
  imsi2?: string
  serial?: string
  cpu?: string
  androidVersion?: string
  batteryLevel?: number
  batteryCharging?: string
  mdmMode?: boolean
  kioskMode?: boolean
  defaultLauncher?: boolean
  launcherType?: string
  launcherPackage?: string
  ipAddress?: string
  externalIp?: string
  lat?: number
  lon?: number
  locationTs?: number
  custom1?: string
  custom2?: string
  custom3?: string
  status: 'ONLINE' | 'OFFLINE' | 'PENDING' | 'RESET'
  lastSync?: string
  enrolledAt?: string
  configId?: number
  groupId?: number
  createdAt: string
}

export interface DeviceFeatures {
  gps: boolean
  imei: boolean
  networkInfo: boolean
  battery: boolean
  android: boolean
  mdmMode: boolean
  kioskMode: boolean
  defaultLauncher: boolean
  configAssigned: boolean
  contacts: boolean
  callLogs: boolean
  installedApps: boolean
  locationHistory: boolean
  online: boolean
  lastSync: boolean
  pushCapable: boolean
}

export interface Configuration {
  id: number
  name: string
  description?: string
  customerId: number
  backgroundColor?: string
  textColor?: string
  backgroundImageUrl?: string
  iconSize?: number
  title?: string
  displayStatus?: boolean
  gps?: boolean
  bluetooth?: boolean
  wifi?: boolean
  mobileData?: boolean
  kioskMode?: boolean
  mainApp?: string
  lockStatusBar?: boolean
  systemUpdateType?: number
  pushOptions?: string
  keepaliveTime?: number
  disableLocation?: boolean
  passwordMode?: string
  timeZone?: string
  orientation?: number
  lockSafeSettings?: boolean
  permissive?: boolean
  kioskExit?: boolean
  kioskHome?: boolean
  kioskRecents?: boolean
  kioskNotifications?: boolean
  kioskSystemInfo?: boolean
  kioskKeyguard?: boolean
  kioskLockButtons?: boolean
  kioskScreenOn?: boolean
  disableScreenshots?: boolean
  autostartForeground?: boolean
  showWifi?: boolean
  usbStorage?: boolean
  autoBrightness?: boolean
  brightness?: number
  manageTimeout?: boolean
  timeoutVal?: number
  lockVolume?: boolean
  manageVolume?: boolean
  volume?: number
  appPermissions?: string
  restrictions?: string
  newServerUrl?: string
  password?: string
  systemUpdateFrom?: string
  systemUpdateTo?: string
  requestUpdates?: string
  custom1?: string
  custom2?: string
  custom3?: string
  createdAt: string
  updatedAt: string
}

export interface Application {
  id: number
  name: string
  pkg: string
  version?: string
  versionCode?: number
  url?: string
  type: 'app' | 'web' | 'intent'
  system?: boolean
  icon?: string
  description?: string
  customerId: number
  createdAt: string
}

export interface Group {
  id: number
  name: string
  description?: string
  customerId: number
  createdAt: string
}

export interface DeviceLog {
  id: number
  deviceId: number
  logTime: string
  severity: number
  tag?: string
  message?: string
}

export interface DeviceLocation {
  id: number
  deviceId: number
  lat: number
  lon: number
  ts: number
  createdAt: string
}

export interface DeviceStats {
  total: number
  online: number
  offline: number
  pending: number
}

export interface DeviceContact {
  id: number
  deviceId: number
  name?: string
  phone?: string
  phoneType?: string
  email?: string
  rawContactId?: string
  createdAt: string
}

export interface CallLogItem {
  id: number
  deviceId: number
  phoneNumber?: string
  callType: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'REJECTED' | 'BLOCKED'
  durationSec: number
  callDate: number
  contactName?: string
  createdAt: string
}

export interface DataCounts {
  contacts: number
  callLogs: number
}

export interface PagedResult<T> {
  devices: T[]
  total: number
  pages: number
}

export interface Geofence {
  id: number
  deviceId: number
  name: string
  description?: string
  latitude: number
  longitude: number
  radius: number
  alertType: 'ENTER' | 'EXIT' | 'BOTH'
  isInside?: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  status: 'OK' | 'ERROR'
  message?: string
  data: T
}
