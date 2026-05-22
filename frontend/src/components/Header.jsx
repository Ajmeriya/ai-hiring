import { LogOut, User } from 'lucide-react'

export default function Header({ onLogout }) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-800">Recruiter Dashboard</h2>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">John Manager</p>
            <p className="text-xs text-gray-500">Recruiter</p>
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
