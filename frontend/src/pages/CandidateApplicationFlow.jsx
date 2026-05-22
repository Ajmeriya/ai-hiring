import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CheckCircle2, Clock3, PlayCircle, ShieldCheck, Brain, Code2, MessageSquare, UploadCloud, RefreshCw } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { getNextRound, getRoundSequence, useCandidateApplications } from '../context/CandidateApplicationContext.jsx'
import { authenticatedFetch } from '../api/authApi.js'

const stageMeta = {
  resume: { label: 'Resume Screening', icon: ShieldCheck, color: 'text-teal-600' },
  aptitude: { label: 'Aptitude Round', icon: Brain, color: 'text-teal-600' },
  dsaSql: { label: 'DSA + SQL Round', icon: Code2, color: 'text-purple-600' },
  aiInterview: { label: 'AI Interview', icon: MessageSquare, color: 'text-sky-600' }
}

const aptitudeQuestions = [
  { question: 'Which data structure is best for FIFO operations?', options: ['Stack', 'Queue', 'Tree', 'Graph'] },
  { question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'] },
  { question: 'Which HTML element is used for the largest heading?', options: ['h6', 'h1', 'header', 'title'] }
]

const dsaPrompts = [
  'Implement a function to reverse a linked list.',
  'Write a SQL query to find the second highest salary.',
  'Explain the difference between DFS and BFS.'
]

const interviewQuestions = [
  'Tell me about your most impactful project.',
  'How do you handle conflict in a team?',
  'Why do you want this role?'
]

function useCameraStream(enabled) {
  const videoRef = useRef(null)

  useEffect(() => {
    let stream

    const startCamera = async () => {
      if (!enabled || !navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        videoRef.current.srcObject = stream
      } catch {
        // Camera permission denied or unavailable; keep the fallback preview visible.
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [enabled])

  return videoRef
}

export default function CandidateApplicationFlow() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs } = useJobs()
  const { getApplicationByJobId, completeRound, getNextRound } = useCandidateApplications()

  const [answers, setAnswers] = useState({})
  const [sqlAnswer, setSqlAnswer] = useState('')
  const [dsaAnswer, setDsaAnswer] = useState('')
  const [interviewAnswer, setInterviewAnswer] = useState('')
  const [aptStarted, setAptStarted] = useState(false)
  const [aptRemainingSeconds, setAptRemainingSeconds] = useState(0)
  const [codeAnswers, setCodeAnswers] = useState([])
  const [codeOutputs, setCodeOutputs] = useState([])
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [showUpdateResumeModal, setShowUpdateResumeModal] = useState(false)
  const [updateResumeFile, setUpdateResumeFile] = useState(null)
  const [updatingResume, setUpdatingResume] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const job = jobs.find((item) => String(item.id) === String(jobId))
  const application = getApplicationByJobId(jobId)
  const videoRef = useCameraStream(cameraEnabled)

  if (!job) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Job not found</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <ShieldCheck size={48} className="mx-auto text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Apply first to unlock the assessment</h1>
          <p className="text-gray-600 mt-2">Upload your resume from the job detail page and the next recruiter-configured round will appear here.</p>
          <button
            onClick={() => navigate(`/candidate/jobs/${job.id}`)}
            className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Go to Job Detail
          </button>
        </div>
      </div>
    )
  }

  const completedStages = application?.progress || []
  const currentStage = application?.currentStage || getNextRound(job, completedStages)
  const roundSequence = useMemo(() => getRoundSequence(job), [job])
  const resumeUploaded = Boolean(application?.resumeScore != null || (application?.resumeStatus && application.resumeStatus !== 'PENDING'))
  const resumeRejected = Boolean(application?.resumeStatus === 'REJECTED' || application?.overallStatus === 'RESUME_REJECTED')
  const resumeLabel = application?.resumeFileName || (resumeUploaded ? 'Resume uploaded' : 'No resume uploaded yet')

  const handleCompleteStage = async (stageKey, score = 100) => {
    await completeRound(job.id, job, stageKey, score)
  }

  const handleUpdateResume = async () => {
    if (!updateResumeFile) {
      setUpdateError('Please select a file')
      return
    }

    setUpdatingResume(true)
    setUpdateError('')
    
    try {
      const formData = new FormData()
      formData.append('resume_file', updateResumeFile)

      const response = await authenticatedFetch(
        `http://localhost:8083/api/applications/${application.id}/evaluate-resume-ai`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (!response.ok) {
        let detail = `HTTP ${response.status}`
        try {
          const errorPayload = await response.json()
          detail = errorPayload?.message || errorPayload?.detail || detail
        } catch {}
        throw new Error(`Resume update failed: ${detail}`)
      }

      // Close modal and refresh
      setShowUpdateResumeModal(false)
      setUpdateResumeFile(null)
      // Reload applications to reflect updated resume
      window.location.reload()
    } catch (err) {
      setUpdateError(err.message || 'Failed to update resume')
    } finally {
      setUpdatingResume(false)
    }
  }

  // Start aptitude round: initialize timer from job config
  const startAptitude = () => {
    // Ask backend to start aptitude; navigate only if successful
    ;(async () => {
      try {
        if (!application?.id) throw new Error('Application not found')
        const res = await authenticatedFetch(`http://localhost:8083/api/applications/${application.id}/round/aptitude/start`, { method: 'POST' })
        if (!res.ok) {
          let msg = `HTTP ${res.status}`
          try {
            const payload = await res.json()
            msg = payload?.message || payload?.detail || msg
          } catch {}
          throw new Error(msg)
        }
        // started successfully — navigate to aptitude page
        navigate(`/candidate/aptitude/${application.id}`)
      } catch (err) {
        // show inline error box by setting a temporary error state
        alert(err.message || 'Failed to start aptitude')
      }
    })()
  }

  // Aptitude timer effect
  useEffect(() => {
    if (!aptStarted || aptRemainingSeconds <= 0) return
    const t = setInterval(() => setAptRemainingSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [aptStarted, aptRemainingSeconds])

  // Auto-submit when timer ends
  useEffect(() => {
    if (aptStarted && aptRemainingSeconds <= 0) {
      // For now, every candidate passes aptitude
      handleCompleteStage('aptitude', 100)
    }
  }, [aptRemainingSeconds, aptStarted])

  // Initialize code answers/outputs when entering dsaSql
  useEffect(() => {
    if (currentStage === 'dsaSql') {
      const count = job.hiringPlan?.dsaQuestions || dsaPrompts.length
      setCodeAnswers(Array(count).fill('// write your code here'))
      setCodeOutputs(Array(count).fill(''))
    }
  }, [currentStage, job])

  const stageCards = roundSequence.map((stageKey) => {
    const meta = stageMeta[stageKey]
    const Icon = meta.icon
    const completed = completedStages.includes(stageKey)
    const active = currentStage === stageKey
    const isResumeStage = stageKey === 'resume'
    const resumeNeedsUpload = isResumeStage && !resumeUploaded
    const stageCompleted = isResumeStage ? resumeUploaded : completed

    return (
      <div
        key={stageKey}
        className={`rounded-lg border p-4 ${active ? 'border-blue-400 bg-blue-50' : stageCompleted ? 'border-sky-200 bg-sky-50' : 'border-gray-200 bg-white'}`}
      >
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Icon size={18} className={meta.color} />
            <h3 className="font-semibold text-gray-800">{meta.label}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageCompleted ? 'bg-sky-100 text-sky-800' : active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
            {stageCompleted ? 'Completed' : active ? 'Active' : 'Locked'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {isResumeStage
            ? (resumeNeedsUpload ? 'Upload your resume to start evaluation.' : 'Resume uploaded and ready for evaluation.')
            : 'Unlocked by recruiter configuration and previous round completion.'}
        </p>
      </div>
    )
  })

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
            <h1 className="text-4xl font-bold text-gray-800">{job.title}</h1>
            <p className="text-gray-600 text-lg mt-2">{job.department} • {job.salary}</p>
          </div>
          <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800">
            {application?.status === 'completed' ? 'Completed' : 'In progress'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-gray-500 text-sm">Applied Resume</p>
            <p className="text-gray-800 font-semibold mt-1">{resumeLabel}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-gray-500 text-sm">Current Stage</p>
            <p className="text-gray-800 font-semibold mt-1">{currentStage ? stageMeta[currentStage].label : 'Completed'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-gray-500 text-sm">Recruiter Config</p>
            <p className="text-gray-800 font-semibold mt-1">{roundSequence.length - 1} assessment rounds</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">{stageCards}</div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {resumeRejected ? (
            <div className="text-center py-10">
              <ShieldCheck size={48} className="mx-auto text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800 mt-4">You are not shortlisted</h2>
              <p className="text-gray-600 mt-2">Your resume score did not meet the threshold for this role, so the aptitude round is locked and the resume cannot be updated.</p>
            </div>
          ) : currentStage === null ? (
            <div className="text-center py-10">
              <CheckCircle2 size={48} className="mx-auto text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mt-4">Assessment Completed</h2>
              <p className="text-gray-600 mt-2">You have finished every round configured for this role.</p>
              <button
                onClick={() => navigate('/candidate/applications')}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold"
              >
                Go to My Applications
              </button>
            </div>
          ) : currentStage === 'resume' && !resumeUploaded ? (
            <div className="text-center py-10">
              <UploadCloud size={48} className="mx-auto text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800 mt-4">Upload your resume first</h2>
              <p className="text-gray-600 mt-2">This application has been created, but the resume is not uploaded yet. Go back to the job page to attach your resume and start evaluation.</p>
              <button
                onClick={() => navigate(`/candidate/jobs/${job.id}`)}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Upload Resume
              </button>
            </div>
          ) : currentStage === 'aptitude' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Brain size={24} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Aptitude Round</h2>
              </div>

              {!aptStarted ? (
                <div className="rounded-lg border p-6 bg-white">
                  <p className="mb-4 text-sm text-gray-600">Instructions</p>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 mb-4">
                    <li>Read each question carefully and select the best answer.</li>
                    <li>You will have <strong>{job.hiringPlan?.aptitudeTime || 20} minutes</strong> to complete this round.</li>
                    <li>Your camera may be activated for proctoring (optional).</li>
                    <li>For now, everyone passes this round—results are provisional.</li>
                  </ul>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={cameraEnabled} onChange={(e) => setCameraEnabled(e.target.checked)} />
                        <span className="text-sm text-gray-600">Enable camera</span>
                      </label>
                    </div>
                    <button onClick={startAptitude} className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">Start Aptitude</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 rounded-lg bg-blue-50 p-4 border border-blue-100 text-sm text-blue-900">
                    Questions: {job.hiringPlan.aptitudeQuestions} • Type: {job.hiringPlan.aptitudeQuestionType} • Topics: {job.hiringPlan.aptitudeTopics}
                    <div className="mt-2 font-mono text-sm">Time left: {Math.max(0, Math.floor(aptRemainingSeconds / 60))}:{String(Math.max(0, aptRemainingSeconds % 60)).padStart(2, '0')}</div>
                  </div>

                  <div className="space-y-4">
                    {aptitudeQuestions.map((item, index) => (
                      <div key={item.question} className="rounded-lg border border-gray-200 p-4">
                        <p className="font-semibold text-gray-800 mb-3">{index + 1}. {item.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {item.options.map((option) => (
                            <label key={option} className={`flex items-center gap-2 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${answers[index] === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <input
                                type="radio"
                                name={`aptitude-${index}`}
                                value={option}
                                checked={answers[index] === option}
                                onChange={() => setAnswers((current) => ({ ...current, [index]: option }))}
                              />
                              <span className="text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <button onClick={() => handleCompleteStage('aptitude', 100)} className="px-6 py-3 rounded-lg btn-cta">Submit Aptitude Round</button>
                    <button onClick={() => { setAptStarted(false); setAptRemainingSeconds(0) }} className="px-4 py-2 rounded-lg border">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ) : currentStage === 'dsaSql' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Code2 size={24} className="text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-800">DSA + SQL Round</h2>
              </div>
              <div className="mb-4 rounded-lg bg-purple-50 p-4 border border-purple-100 text-sm text-purple-900">
                DSA Questions: {job.hiringPlan.dsaQuestions} ({job.hiringPlan.dsaDifficulty || 'medium'}) • SQL Questions: {job.hiringPlan.sqlQuestions} ({job.hiringPlan.sqlDifficulty || 'medium'}) • DSA Topics: {job.hiringPlan.dsaTopics} • SQL Topics: {job.hiringPlan.sqlTopics} • Time: {job.hiringPlan.dsaSqlTime} mins
              </div>

              <div className="space-y-4">
                {dsaPrompts.map((prompt, index) => (
                  <div key={prompt} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-semibold text-gray-800 mb-3">DSA Question {index + 1}</p>
                    <p className="text-sm text-gray-600">{prompt}</p>
                    <textarea
                      value={dsaAnswer}
                      onChange={(event) => setDsaAnswer(event.target.value)}
                      placeholder="Write your solution approach here"
                      className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-28"
                    />
                  </div>
                ))}

                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-800 mb-3">SQL Question</p>
                  <p className="text-sm text-gray-600 mb-3">Write a query to find candidates who have completed all enabled rounds.</p>
                  <textarea
                    value={sqlAnswer}
                    onChange={(event) => setSqlAnswer(event.target.value)}
                    placeholder="Write your SQL query here"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-28"
                  />
                </div>
              </div>

              <button
                onClick={() => handleCompleteStage('dsaSql', 88)}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold hover:from-purple-700 hover:to-fuchsia-700 transition-all"
              >
                Submit DSA + SQL Round
              </button>
            </div>
          ) : currentStage === 'aiInterview' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Camera size={24} className="text-sky-600" />
                <h2 className="text-2xl font-bold text-gray-800">AI Interview</h2>
              </div>
              <div className="mb-4 rounded-lg bg-sky-50 p-4 border border-sky-100 text-sm text-sky-900">
                Interview time: {job.hiringPlan.aiTime} mins • Topics: {job.hiringPlan.aiTopics}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Camera Preview</h3>
                    <button
                      onClick={() => setCameraEnabled(true)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold"
                    >
                      Enable Camera
                    </button>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraEnabled ? 'block' : 'hidden'}`} />
                    {!cameraEnabled && (
                      <div className="text-center text-white/80 p-6">
                        <Camera size={40} className="mx-auto mb-3" />
                        <p className="font-semibold">Camera is off</p>
                        <p className="text-sm mt-1">Click Enable Camera to start the AI interview preview.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {interviewQuestions.map((question, index) => (
                    <div key={question} className="rounded-lg border border-gray-200 p-4">
                      <p className="font-semibold text-gray-800 mb-2">AI Question {index + 1}</p>
                      <p className="text-sm text-gray-600">{question}</p>
                    </div>
                  ))}
                  <textarea
                    value={interviewAnswer}
                    onChange={(event) => setInterviewAnswer(event.target.value)}
                    placeholder="Type your spoken answer summary here"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                  />
                </div>
              </div>

              <button
                onClick={() => handleCompleteStage('aiInterview', 94)}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Submit Interview
              </button>
            </div>
          ) : currentStage === 'resume' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={24} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Resume Screening Complete</h2>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 text-sm text-blue-900 mb-4">
                Your resume has been uploaded successfully. The next round is unlocked based on recruiter configuration.
              </div>
              <button
                onClick={() => {
                  const nextStage = getNextRound(job, completedStages)
                  if (nextStage) {
                    navigate(`/candidate/applications/${job.id}`)
                  }
                }}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                View Next Round
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <CheckCircle2 size={48} className="mx-auto text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mt-4">Assessment Completed</h2>
              <p className="text-gray-600 mt-2">You have finished every round configured for this role.</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Resume Modal */}
      {showUpdateResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Update Resume</h3>
              <button
                onClick={() => {
                  setShowUpdateResumeModal(false)
                  setUpdateResumeFile(null)
                  setUpdateError('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Upload a different resume for this job. The new resume will be evaluated and may change your assessment results.
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {updateError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select PDF or TXT File
              </label>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => {
                  setUpdateResumeFile(e.target.files?.[0] || null)
                  setUpdateError('')
                }}
                className="block w-full text-sm text-gray-600 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 10MB. PDF or TXT files only.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUpdateResumeModal(false)
                  setUpdateResumeFile(null)
                  setUpdateError('')
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateResume}
                disabled={!updateResumeFile || updatingResume}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {updatingResume ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Update Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
