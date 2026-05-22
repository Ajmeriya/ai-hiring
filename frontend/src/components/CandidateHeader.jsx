import { LogOut, User } from 'lucide-react'

export default function CandidateHeader({ userProfile, onLogout }) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Candidate Portal</h2>
        <p className="text-sm text-gray-500">Apply, attempt rounds, and track your progress</p>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{userProfile?.fullName || 'Candidate'}</p>
            <p className="text-xs text-gray-500">{userProfile?.email || 'candidate@company.com'}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </header>
  )
}
