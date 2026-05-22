import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Building2, Users, Briefcase } from 'lucide-react'
import { register } from '../api/authApi.js'

export default function RegisterPage({ onRegister }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    accountType: 'RECRUITER',
    fullName: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters long.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (formData.accountType === 'RECRUITER' && !formData.companyName.trim()) {
      setError('Company name is required for recruiter accounts.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await register(
        formData.fullName,
        formData.email,
        formData.password,
        formData.accountType
      )

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
      onRegister({
        accountType: response.role.toLowerCase(),
        fullName: response.fullName,
        email: response.email
      })

      // Navigate to dashboard
      navigate(
        response.role === 'RECRUITER' ? '/dashboard' : '/candidate-dashboard'
      )
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
      console.error('Registration error:', err)
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
      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-10 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-block mb-4 p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <h1 className="text-3xl font-black text-white">+</h1>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">Create Account</h1>
            <p className="text-gray-600 font-medium">Recruiter Portal</p>
            <p className="text-sm text-gray-500 mt-2">Set up your hiring workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Register As
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: 'CANDIDATE', label: 'Candidate', icon: Users, gradientFrom: 'from-blue-500', gradientTo: 'to-sky-500' },
                  { value: 'RECRUITER', label: 'Recruiter', icon: Briefcase, gradientFrom: 'from-indigo-500', gradientTo: 'to-blue-500' }
                ].map((option) => {
                  const Icon = option.icon
                  const selected = formData.accountType === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('accountType', option.value)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                        selected
                          ? `border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-900 shadow-lg`
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${option.gradientFrom} ${option.gradientTo} text-white font-bold`}>
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="block font-semibold text-sm">{option.label}</span>
                        <span className={`block text-xs ${selected ? 'text-blue-600' : 'text-gray-500'}`}>Create a {option.label.toLowerCase()} account</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-3 text-blue-400" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    placeholder="John Manager"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-3 text-blue-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                    required
                  />
                </div>
              </div>

              {formData.accountType === 'RECRUITER' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 size={20} className="absolute left-3 top-3 text-blue-400" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(event) => updateField('companyName', event.target.value)}
                      placeholder="Acme Hiring Inc."
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-3 text-blue-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Create a password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-3 text-blue-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50 hover:bg-gray-50"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-cta mt-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text hover:from-indigo-700 hover:to-blue-700 transition-all">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500 mt-6">
            © 2024 AI Hiring Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
