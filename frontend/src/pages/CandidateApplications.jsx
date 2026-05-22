import { Link } from 'react-router-dom'
import { FileText, PlayCircle, BadgeCheck, Hourglass } from 'lucide-react'
import { useCandidateApplications } from '../context/CandidateApplicationContext.jsx'

export default function CandidateApplications() {
  const { applications } = useCandidateApplications()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Applications</h1>

      {applications.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {applications.map((application) => (
            <div key={application.jobId} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{application.jobTitle}</h2>
                  <p className="text-sm text-gray-500 mt-1">{application.department}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${application.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {application.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>

              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2"><FileText size={16} className="text-blue-600" /> Resume: {application.resumeFileName}</p>
                <p className="flex items-center gap-2"><Hourglass size={16} className="text-blue-600" /> Next round: {application.currentStage || 'None'}</p>
                <p className="text-gray-500 line-clamp-3">{application.resumeSummary || 'No summary provided.'}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {application.progress.map((stage) => (
                  <span key={stage} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {stage}
                  </span>
                ))}
              </div>

              <Link
                to={`/candidate/applications/${application.jobId}`}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <PlayCircle size={18} />
                Continue
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <BadgeCheck size={40} className="mx-auto text-blue-600" />
          <p className="text-gray-700 text-lg mt-4">You have not applied to any jobs yet.</p>
          <Link to="/candidate/jobs" className="inline-block mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            Browse jobs
          </Link>
        </div>
      )}
    </div>
  )
}
