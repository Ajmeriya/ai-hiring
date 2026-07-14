import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Calendar, ClipboardList, UploadCloud, CheckCircle2, Clock3 } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { useCandidateApplications } from '../context/CandidateApplicationContext.jsx'
import { buildFallbackJobFromApplication } from '../utils/jobFallback.js'

export default function CandidateJobDetail({ userProfile }) {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs } = useJobs()
  const { getApplicationByJobId, applyForJob } = useCandidateApplications()

  const [resumeFile, setResumeFile] = useState(null)
  const [resumeSummary, setResumeSummary] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const application = getApplicationByJobId(jobId)
  const job = jobs.find((item) => String(item.id) === String(jobId)) || buildFallbackJobFromApplication(application)
  const resumePending = Boolean(application && (!application.resumeStatus || application.resumeStatus === 'PENDING'))
  const resumeRejected = Boolean(application && (application.resumeStatus === 'REJECTED' || application.overallStatus === 'RESUME_REJECTED'))

  useEffect(() => {
    setResumeFile(null)
    setResumeSummary('')
    setError('')
    setIsSubmitting(false)
  }, [jobId])

  if (!job) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Job not found</p>
      </div>
    )
  }

  const roundList = [
    { key: 'resume', label: 'Resume Screening', enabled: true, info: 'Upload your resume to apply.' },
    { key: 'experience', label: 'Required experience', enabled: true, info: job.hiringPlan?.requiredExperienceYears != null ? `${job.hiringPlan.requiredExperienceYears} year(s)` : 'Not specified by recruiter.' },
    { key: 'aptitude', label: 'Aptitude', enabled: !!job.hiringPlan?.aptitudeEnabled, info: job.hiringPlan?.aptitudeEnabled ? `${job.hiringPlan.aptitudeQuestions} questions • ${job.hiringPlan.aptitudeTime} mins` : 'Not configured by recruiter.' },
    { key: 'dsaSql', label: 'DSA + SQL', enabled: !!job.hiringPlan?.dsaSqlEnabled, info: job.hiringPlan?.dsaSqlEnabled ? `${job.hiringPlan.dsaQuestions} DSA questions (${job.hiringPlan.dsaDifficulty || 'medium'}) + ${job.hiringPlan.sqlQuestions} SQL questions (${job.hiringPlan.sqlDifficulty || 'medium'}) • ${job.hiringPlan.dsaSqlTime} mins` : 'Not configured by recruiter.' },
    { key: 'aiInterview', label: 'AI Interview', enabled: !!job.hiringPlan?.aiEnabled, info: job.hiringPlan?.aiEnabled ? `${job.hiringPlan.aiTime} mins • Topics: ${job.hiringPlan.aiTopics}` : 'Not configured by recruiter.' }
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!resumeFile) {
      setError('Please upload your resume before applying.')
      return
    }

    try {
      setIsSubmitting(true)
      const summary = (await resumeFile.text()).slice(0, 500)
      await applyForJob(job, userProfile, {
        fileName: resumeFile.name,
        summary: summary || 'Resume uploaded successfully.',
        file: resumeFile
      })
      navigate(`/candidate/applications/${job.id}`)
    } catch (e) {
      setError(e?.message || 'Unable to process the resume file. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-semibold"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Briefcase size={22} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{job.title}</h1>
                <p className="text-sm text-gray-500">{job.department}</p>
              </div>
            </div>
            <p className="text-gray-600">{job.description}</p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${job.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
            {job.status === 'active' ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Posted Date</p>
            <p className="font-semibold text-gray-800 flex items-center gap-2"><Calendar size={16} className="text-blue-600" /> {job.postedDate}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Applicants</p>
            <p className="font-semibold text-gray-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-600" /> {job.applicants}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-1">Salary</p>
            <p className="font-semibold text-gray-800 flex items-center gap-2"><Clock3 size={16} className="text-blue-600" /> {job.salary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Apply with Resume</h2>

          {application && resumeRejected ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <h3 className="font-semibold text-red-900">You are not shortlisted</h3>
              <p className="text-sm text-red-800 mt-2">Your resume did not meet the shortlist threshold for this job. You cannot upload a different resume for the same application.</p>
            </div>
          ) : application && !resumePending ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-semibold text-blue-900">Application submitted</h3>
              <p className="text-sm text-blue-800 mt-2">Resume file: {application.resumeFileName}</p>
              <p className="text-sm text-blue-800">Current stage: {application.currentStage || 'Assessment completed'}</p>
              <button
                onClick={() => navigate(`/candidate/applications/${job.id}`)}
                className="mt-4 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Continue Assessment
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {application && resumePending && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  Your application exists, but resume is not uploaded yet. Upload it now to start AI evaluation and unlock the next round.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Resume</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <UploadCloud size={32} className="mx-auto text-blue-600" />
                  <p className="font-semibold text-gray-800 mt-2">Drop your resume or choose a file</p>
                  <p className="text-sm text-gray-500 mb-4">PDF or TXT</p>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Summary</label>
                <textarea
                  value={resumeSummary}
                  onChange={(event) => setResumeSummary(event.target.value)}
                  placeholder="Optional: paste a short summary of your experience"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : 'Apply Now'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recruiter Configured Rounds</h2>
          <div className="space-y-4">
            {roundList.map((round) => (
              <div
                key={round.key}
                className={`rounded-lg border p-4 ${round.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-70'}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-gray-800">{round.label}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${round.enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}`}>
                    {round.enabled ? 'Enabled' : 'Skipped'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{round.info}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-800 mb-2">How it works</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>1. Upload resume to create an application.</li>
              <li>2. Complete only the rounds enabled by the recruiter.</li>
              <li>3. Reach the AI interview with webcam preview enabled.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
