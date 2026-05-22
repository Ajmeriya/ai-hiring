import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Users, Briefcase } from 'lucide-react'
import { login } from '../api/authApi.js'

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('RECRUITER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(email, password)

      // Store token and user info
      localStorage.setItem('ai-hiring-platform-auth-token', response.token)
      localStorage.setItem('ai-hiring-platform-authenticated', 'true')
      localStorage.setItem(
        'ai-hiring-platform-user-role',
        response.role.toLowerCase()
      )
      localStorage.setItem(
        'ai-hiring-platform-user-profile',
        JSON.stringify({
          id: response.userId,
          fullName: response.fullName,
          email: response.email,
          role: response.role
        })
      )

      // Call parent callback
      onLogin({
        accountType: response.role.toLowerCase(),
        email: response.email,
        fullName: response.fullName
      })

      // Navigate to dashboard
      navigate(
        response.role === 'RECRUITER' ? '/dashboard' : '/candidate-dashboard'
      )
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-500 to-sky-600 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -ml-48 -mb-48"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-block mb-4 p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <h1 className="text-3xl font-black text-white">AI</h1>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">AI Hiring</h1>
            <p className="text-gray-600 font-medium">
              {selectedRole === 'candidate' ? 'Candidate Portal' : 'Recruiter Portal'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {selectedRole === 'candidate'
                ? 'Apply for jobs and take recruiter-configured assessments'
                : 'Automate your hiring process'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setSelectedRole('RECRUITER')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition-all ${
                selectedRole === 'RECRUITER'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Briefcase size={18} />
              Recruiter Login
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('CANDIDATE')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition-all ${
                selectedRole === 'CANDIDATE'
                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              Candidate Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-3 text-blue-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'candidate' ? 'candidate@company.com' : 'recruiter@company.com'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-3 text-blue-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 mt-6 ${
                selectedRole === 'CANDIDATE'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Signing in...' : selectedRole === 'CANDIDATE' ? 'Enter Candidate Portal' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
            <p className="text-xs font-semibold text-amber-900 mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-amber-800">Email: recruiter@company.com</p>
            <p className="text-xs text-amber-800">Password: any password</p>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            New recruiter or candidate?{' '}
            <Link to="/register" className="font-semibold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text hover:from-blue-700 hover:to-indigo-700 transition-all">
              Create an account
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2024 AI Hiring Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
