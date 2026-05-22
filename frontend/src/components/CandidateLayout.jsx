import { Outlet, useNavigate } from 'react-router-dom'
import CandidateSidebar from './CandidateSidebar.jsx'
import CandidateHeader from './CandidateHeader.jsx'

export default function CandidateLayout({ userProfile, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CandidateSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CandidateHeader userProfile={userProfile} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
