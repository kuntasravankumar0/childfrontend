import { useState, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Smartphone, Lock, User } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(loginId, password)
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Invalid credentials. Please try again.')
      } else if (err.code === 'ERR_NETWORK') {
        toast.error('Cannot reach server. Check that the backend is running.')
      } else {
        toast.error('Login failed. Check console for details.')
        console.error('Login error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Smartphone className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Headwind MDM</h1>
          <p className="text-primary-200 mt-1">Mobile Device Management</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to Admin Panel</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="login">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="login"
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your username"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  className="input pl-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
