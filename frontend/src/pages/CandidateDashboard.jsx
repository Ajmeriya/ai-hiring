import { Link } from 'react-router-dom'
import { Briefcase, FileText, Hourglass, BadgeCheck, ArrowRight } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { useCandidateApplications } from '../context/CandidateApplicationContext.jsx'

export default function CandidateDashboard({ userProfile }) {
  const { jobs } = useJobs()
  const { applications } = useCandidateApplications()

  const openJobs = jobs.filter((job) => job.status === 'active')
  const inProgressApplications = applications.filter((application) => application.status === 'in-progress')
  const completedApplications = applications.filter((application) => application.status === 'completed')

  const stats = [
    { label: 'Open Jobs', value: openJobs.length, icon: Briefcase, color: 'bg-blue-100' },
    { label: 'Applied Jobs', value: applications.length, icon: FileText, color: 'bg-blue-100' },
    { label: 'In Progress', value: inProgressApplications.length, icon: Hourglass, color: 'bg-yellow-100' },
    { label: 'Completed', value: completedApplications.length, icon: BadgeCheck, color: 'bg-green-100' }
  ]

  return (
    <div className="p-8 space-y-8 bg-gradient-to-b from-blue-50 to-white min-h-full">
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 text-white p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-blue-100 text-sm font-semibold uppercase tracking-[0.24em]">Candidate Portal</p>
            <h1 className="text-4xl font-black mt-2">Own your application journey</h1>
            <p className="text-blue-50 mt-3 max-w-2xl">
              Browse open jobs, upload your resume, and continue through only the assessment rounds that the recruiter enabled.
            </p>
          </div>
          <Link
            to="/candidate/jobs"
            className="flex items-center space-x-2 bg-white text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all font-semibold shadow-lg"
          >
            <span>Browse Jobs</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Candidate Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-2xl`}>
                  <Icon size={24} className="text-gray-700" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Applications</h2>
              <p className="text-sm text-gray-500">Track your resume uploads and active assessments</p>
            </div>
            <Link to="/candidate/applications" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {applications.length > 0 ? (
              applications.slice(0, 3).map((application) => (
                <Link
                  key={application.jobId}
                  to={`/candidate/applications/${application.jobId}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">{application.jobTitle}</p>
                      <p className="text-sm text-gray-500">Resume: {application.resumeFileName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${application.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {application.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">Current stage: {application.currentStage || 'Assessment complete'}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-600">No applications yet.</p>
                <Link to="/candidate/jobs" className="inline-block mt-3 text-blue-600 font-semibold hover:text-blue-700">
                  Browse open jobs
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Recommended Jobs</h2>
              <p className="text-sm text-gray-500">Latest recruiter postings with configurable assessment rounds</p>
            </div>
          </div>

          <div className="space-y-4">
            {openJobs.slice(0, 3).map((job) => (
              <Link
                key={job.id}
                to={`/candidate/jobs/${job.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.department} • {job.salary}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    Open
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{job.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
