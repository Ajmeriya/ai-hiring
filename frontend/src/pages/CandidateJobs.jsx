import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Calendar, Users, Clock3 } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { useCandidateApplications } from '../context/CandidateApplicationContext.jsx'

export default function CandidateJobs() {
  const { jobs } = useJobs()
  const { getApplicationByJobId } = useCandidateApplications()
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  // Get current candidate email to verify application ownership
  const currentCandidateEmail = useMemo(() => {
    try {
      const userProfileStr = typeof window !== 'undefined' ? window.localStorage.getItem('ai-hiring-platform-user-profile') : null
      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null
      return userProfile?.email || null
    } catch {
      return null
    }
  }, [])

  const openJobs = jobs.filter((job) => job.status === 'active')
  const departments = ['all', ...new Set(openJobs.map((job) => job.department))]

  const filteredJobs = openJobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  const roundTags = (job) => {
    const tags = ['Resume']

    if (job.hiringPlan?.aptitudeEnabled) tags.push('Aptitude')
    if (job.hiringPlan?.dsaSqlEnabled) tags.push('DSA + SQL')
    if (job.hiringPlan?.aiEnabled) tags.push('AI Interview')

    return tags
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Browse Jobs</h1>

      <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="relative lg:col-span-2">
            <Search size={20} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or department"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Filter size={20} className="absolute left-3 top-3 text-gray-400" />
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department === 'all' ? 'All departments' : department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredJobs.map((job) => {
          const application = getApplicationByJobId(job.id)
          // Defensive check: Only show application status if application belongs to current candidate
          const validApplication = application && (
            !currentCandidateEmail || application.candidateEmail === currentCandidateEmail
          ) ? application : null

          return (
            <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{job.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{job.company} • {job.department} • {job.salary}</p>
                  <p className="text-xs text-gray-500 mt-1">Experience: {job.hiringPlan?.requiredExperienceYears != null ? `${job.hiringPlan.requiredExperienceYears}+ years` : 'Not specified'}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Active
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4">{job.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 border-t border-b border-gray-200 py-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  <span>{job.applicants} applicants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span>{job.postedDate}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Clock3 size={16} className="text-blue-600" />
                  <span>{roundTags(job).join(' • ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {roundTags(job).map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  {validApplication ? `Application: ${validApplication.status}` : 'No application yet'}
                </p>
                <Link
                  to={`/candidate/jobs/${job.id}`}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {validApplication ? 'Continue' : 'View & Apply'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
