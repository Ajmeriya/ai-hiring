import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import JobsList from './pages/JobsList.jsx'
import JobPostPage from './pages/JobPostPage.jsx'
import JobDetail from './pages/JobDetail.jsx'
import CandidateEvaluation from './pages/CandidateEvaluation.jsx'
import Layout from './components/Layout.jsx'
import CandidateLayout from './components/CandidateLayout.jsx'
import { JobProvider } from './context/JobContext.jsx'
import { CandidateApplicationProvider } from './context/CandidateApplicationContext.jsx'
import CandidateDashboard from './pages/CandidateDashboard.jsx'
import CandidateJobs from './pages/CandidateJobs.jsx'
import CandidateJobDetail from './pages/CandidateJobDetail.jsx'
import CandidateApplications from './pages/CandidateApplications.jsx'
import CandidateApplicationFlow from './pages/CandidateApplicationFlow.jsx'
import CandidateAptitude from './pages/CandidateAptitude.jsx'
import CandidateTechnicalRound from './pages/CandidateTechnicalRound.jsx'
import { logout } from './api/authApi.js'

const AUTH_STORAGE_KEY = 'ai-hiring-platform-authenticated'
const AUTH_TOKEN_KEY = 'ai-hiring-platform-auth-token'
const ROLE_STORAGE_KEY = 'ai-hiring-platform-user-role'
const PROFILE_STORAGE_KEY = 'ai-hiring-platform-user-profile'

const defaultRecruiterProfile = {
  accountType: 'recruiter',
  fullName: 'John Manager',
  email: 'recruiter@company.com',
  companyName: 'AI Hiring Platform'
}

function readStoredProfile() {
  if (typeof window === 'undefined') {
    return defaultRecruiterProfile
  }

  try {
    const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    return storedProfile ? JSON.parse(storedProfile) : defaultRecruiterProfile
  } catch {
    return defaultRecruiterProfile
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    // Check if token exists
    return !!window.localStorage.getItem(AUTH_TOKEN_KEY)
  })
  const [userRole, setUserRole] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultRecruiterProfile.accountType
    }

    return window.localStorage.getItem(ROLE_STORAGE_KEY) || readStoredProfile().accountType || defaultRecruiterProfile.accountType
  })
  const [userProfile, setUserProfile] = useState(readStoredProfile)

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, String(isAuthenticated))
      window.localStorage.setItem(ROLE_STORAGE_KEY, userRole)
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile))
    } catch {
      // Ignore storage errors in private or restricted browser sessions.
    }
  }, [isAuthenticated, userRole, userProfile])

  const handleLogin = (loginData = {}) => {
    const accountType = loginData.accountType || userProfile?.accountType || defaultRecruiterProfile.accountType
    const email = loginData.email || userProfile?.email || (accountType === 'candidate' ? 'candidate@company.com' : 'recruiter@company.com')
    const fullName = loginData.fullName || (accountType === 'candidate' ? 'Candidate User' : 'John Manager')
    const sameRoleProfile = userProfile?.accountType === accountType ? userProfile : null

    setUserProfile((currentProfile) => ({
      ...currentProfile,
      accountType,
      email,
      fullName: loginData.fullName || sameRoleProfile?.fullName || fullName
    }))
    setUserRole(accountType)
    setIsAuthenticated(true)
  }

  const handleRegister = (profile) => {
    const normalizedProfile = {
      accountType: profile.accountType || defaultRecruiterProfile.accountType,
      fullName: profile.fullName,
      email: profile.email,
      companyName: profile.companyName || ''
    }

    setUserProfile(normalizedProfile)
    setUserRole(normalizedProfile.accountType)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      await logout(token)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear all auth data
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(ROLE_STORAGE_KEY)
      localStorage.removeItem(PROFILE_STORAGE_KEY)

      setIsAuthenticated(false)
      setUserRole(defaultRecruiterProfile.accountType)
      setUserProfile(defaultRecruiterProfile)
    }
  }

  return (
    <JobProvider>
      <CandidateApplicationProvider currentUserProfile={userProfile} isAuthenticated={isAuthenticated}>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to={userRole === 'candidate' ? '/candidate/dashboard' : '/dashboard'} replace />
                ) : (
                  <LoginPage onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to={userRole === 'candidate' ? '/candidate/dashboard' : '/dashboard'} replace />
                ) : (
                  <RegisterPage onRegister={handleRegister} />
                )
              }
            />

            {isAuthenticated ? (
              userRole === 'candidate' ? (
                <Route element={<CandidateLayout userProfile={userProfile} onLogout={handleLogout} />}>
                  <Route path="/candidate/dashboard" element={<CandidateDashboard userProfile={userProfile} />} />
                  <Route path="/candidate/jobs" element={<CandidateJobs />} />
                  <Route path="/candidate/jobs/:jobId" element={<CandidateJobDetail userProfile={userProfile} />} />
                  <Route path="/candidate/applications" element={<CandidateApplications />} />
                  <Route path="/candidate/applications/:jobId" element={<CandidateApplicationFlow />} />
                  <Route path="/candidate/aptitude/:applicationId" element={<CandidateAptitude />} />
                  <Route path="/candidate/technical/:jobId" element={<CandidateTechnicalRound />} />
                  <Route path="/candidate/assessment" element={<CandidateApplications />} />
                  <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/candidate/dashboard" replace />} />
                </Route>
              ) : (
                <Route element={<Layout onLogout={handleLogout} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/jobs/new" element={<JobPostPage />} />
                  <Route path="/jobs" element={<JobsList />} />
                  <Route path="/jobs/:jobId" element={<JobDetail />} />
                  <Route path="/candidates/:candidateId" element={<CandidateEvaluation />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              )
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </Router>
      </CandidateApplicationProvider>
    </JobProvider>
  )
}

export default App
