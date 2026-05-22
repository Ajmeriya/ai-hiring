import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, FileText, ClipboardCheck } from 'lucide-react'

export default function CandidateSidebar() {
  const location = useLocation()

  const menuItems = [
    { path: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/candidate/jobs', label: 'Browse Jobs', icon: Briefcase },
    { path: '/candidate/applications', label: 'My Applications', icon: FileText },
    { path: '/candidate/assessment', label: 'Assessment Room', icon: ClipboardCheck }
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-800 to-indigo-900 text-white p-6 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Hiring</h1>
        <p className="text-gray-400 text-sm">Candidate Portal</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
