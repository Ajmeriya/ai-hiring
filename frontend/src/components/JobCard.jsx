import { Briefcase, Users, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { APPLICATION_SERVICE_URL } from '../config/serviceUrls.js'

export default function JobCard({ job }) {
  const [applicantsCount, setApplicantsCount] = useState(job.applicants || 0)

  useEffect(() => {
    const fetchApplicantsCount = async () => {
      try {
        const response = await fetch(`${APPLICATION_SERVICE_URL}/job/${job.id}/count`)
        if (response.ok) {
          const count = await response.json()
          setApplicantsCount(count)
        }
      } catch (error) {
        console.error('Failed to fetch applicants count:', error)
        // Keep the default count if fetch fails
      }
    }

    fetchApplicantsCount()
  }, [job.id])

  return (
    <Link to={`/jobs/${job.id}`}>
      <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Briefcase size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">{job.title}</h3>
              <p className="text-sm text-neutral-500">{job.department}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${job.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`}>
            {job.status === 'active' ? 'Active' : 'Closed'}
          </span>
        </div>

        <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
          {job.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-t border-b border-gray-200 lg:grid-cols-4">
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-blue-600" />
            <div>
              <p className="text-xs text-neutral-500">Applicants</p>
              <p className="text-lg font-bold text-neutral-800">{applicantsCount}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={18} className="text-blue-600" />
            <div>
              <p className="text-xs text-neutral-500">Posted</p>
              <p className="text-sm font-semibold text-neutral-800">{job.postedDate}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Salary</p>
            <p className="text-sm font-semibold text-gray-800">{job.salary}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Experience</p>
            <p className="text-sm font-semibold text-gray-800">{job.requiredExperienceYears != null ? `${job.requiredExperienceYears}+ years` : 'Not specified'}</p>
          </div>
        </div>

        <button className="w-full btn-cta text-sm font-semibold">
          View Applicants
        </button>
      </div>
    </Link>
  )
}
