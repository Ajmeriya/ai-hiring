import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, PlayCircle, ShieldCheck, Brain, Code2, MessageSquare, UploadCloud, RefreshCw } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { getNextRound, getRoundSequence, useCandidateApplications } from '../context/CandidateApplicationContext.jsx'
import { authenticatedFetch } from '../api/authApi.js'
import { QUESTION_SERVICE_URL, EXECUTION_SERVICE_URL } from '../config/serviceUrls.js'
import { buildFallbackJobFromApplication } from '../utils/jobFallback.js'

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

function getStarterCode(question, language) {
  const normalizedLanguage = (language || '').toLowerCase()
  if (normalizedLanguage === 'java') {
    return question.starterCodeJava || 'public class Main {\n    public static void main(String[] args) throws Exception {\n\n    }\n}'
  }
  if (normalizedLanguage === 'cpp') {
    return question.starterCodeCpp || '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n'
  }
  if (normalizedLanguage === 'sql') {
    return question.starterCodeSql || '-- Write your SQL query here\n'
  }
  return question.starterCodePython || 'import sys\n\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n'
}

function getDefaultLanguage(question) {
  if ((question.topic || '').toLowerCase() === 'sql') {
    return 'sql'
  }
  return 'python'
}

function normalizeRoundResults(response) {
  return {
    passed: response?.passed ?? 0,
    total: response?.total ?? 0,
    verdict: response?.verdict || 'Unknown',
    stdout: response?.stdout || '',
    stderr: response?.stderr || '',
    executionTimeMs: response?.executionTimeMs ?? 0,
    results: Array.isArray(response?.results) ? response.results : []
  }
}

function didPassHiddenTests(response) {
  const results = Array.isArray(response?.results) ? response.results : []
  const hiddenResults = results.filter((result) => result.hidden)
  if (hiddenResults.length === 0) {
    return response?.verdict === 'Accepted'
  }

  return hiddenResults.every((result) => result.passed)
}

function buildTechnicalAssignRequest(applicationId, job) {
  const technicalConfig = job?.hiringPlan?.technicalConfig || {}

  return {
    applicationId,
    jobId: job?.id,
    dsaCount: technicalConfig.dsaQuestions || 0,
    dsaTopics: technicalConfig.dsaTopics ? technicalConfig.dsaTopics.split(',').map((item) => item.trim()).filter(Boolean) : [],
    dsaDifficulty: technicalConfig.dsaDifficulty || 'medium',
    sqlCount: technicalConfig.sqlQuestions || 0,
    sqlTopics: technicalConfig.sqlTopics ? technicalConfig.sqlTopics.split(',').map((item) => item.trim()).filter(Boolean) : [],
    sqlDifficulty: technicalConfig.sqlDifficulty || 'medium'
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

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
  const location = useLocation()
  const navigate = useNavigate()
  const { jobs } = useJobs()
  const { getApplicationByJobId, completeRound, getNextRound } = useCandidateApplications()

  const [answers, setAnswers] = useState({})
  const [sqlAnswer, setSqlAnswer] = useState('')
  const [interviewAnswer, setInterviewAnswer] = useState('')
  const [aptStarted, setAptStarted] = useState(false)
  const [aptRemainingSeconds, setAptRemainingSeconds] = useState(0)
  const [technicalRoundStarted, setTechnicalRoundStarted] = useState(false)
  const [technicalQuestions, setTechnicalQuestions] = useState([])
  const [technicalLoading, setTechnicalLoading] = useState(false)
  const [technicalError, setTechnicalError] = useState('')
  const [currentTechnicalIndex, setCurrentTechnicalIndex] = useState(0)
  const [codeByQuestionId, setCodeByQuestionId] = useState({})
  const [languageByQuestionId, setLanguageByQuestionId] = useState({})
  const [runResultByQuestionId, setRunResultByQuestionId] = useState({})
  const [successfulSubmissionByQuestionId, setSuccessfulSubmissionByQuestionId] = useState({})
  const [runningQuestionId, setRunningQuestionId] = useState(null)
  const [submittingQuestionId, setSubmittingQuestionId] = useState(null)
  const [submittingTechnical, setSubmittingTechnical] = useState(false)
  const [showUpdateResumeModal, setShowUpdateResumeModal] = useState(false)
  const [updateResumeFile, setUpdateResumeFile] = useState(null)
  const [updatingResume, setUpdatingResume] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const application = getApplicationByJobId(jobId)
  const job = jobs.find((item) => String(item.id) === String(jobId)) || buildFallbackJobFromApplication(application) || {}
  const technicalPlan = job?.hiringPlan?.technicalConfig || {}
  const configuredDsaSqlTime = Number(
    job?.hiringPlan?.dsaSqlTime
      ?? technicalPlan?.dsaSqlTime
      ?? technicalPlan?.timeLimitMinutes
      ?? 0
  ) || null
  const videoRef = useRef(null)
  const forcedStage = location.state?.forceStage || null
  const currentTechnicalQuestion = technicalQuestions[currentTechnicalIndex] || null

  const roundSequence = getRoundSequence(job)
  const completedStages = application?.progress || []
  const currentStage = forcedStage || application?.currentStage || getNextRound(job, completedStages)
  const resumeUploaded = Boolean(application?.resumeFileName)
  const resumeRejected = Boolean(application && (application.resumeStatus === 'REJECTED' || application.overallStatus === 'RESUME_REJECTED'))
  const resumeLabel = application?.resumeFileName || 'Not uploaded'
  const aptitudeFailed = application?.aptitudeStatus === 'FAILED' || application?.overallStatus === 'REJECTED'
  const allTechnicalQuestionsSubmitted = technicalQuestions.length > 0 && technicalQuestions.every((question) => successfulSubmissionByQuestionId[question.id])

  const handleStartTechnicalRound = async () => {
    navigate(`/candidate/technical/${job.id}`, { replace: false })
  }

  const handleNextTechnicalQuestion = () => {
    setCurrentTechnicalIndex((i) => Math.min(i + 1, technicalQuestions.length - 1))
  }

  const handlePreviousTechnicalQuestion = () => {
    setCurrentTechnicalIndex((i) => Math.max(i - 1, 0))
  }

  const handleSubmitCurrentQuestion = async () => {
    const question = currentTechnicalQuestion
    if (!question?.id) return
    setSubmittingQuestionId(question.id)
    try {
      const tcRes = await fetch(`${QUESTION_SERVICE_URL}/${question.id}/test-cases`)
      if (!tcRes.ok) throw new Error(`Failed to load test cases: ${tcRes.status}`)
      const testcases = await tcRes.json()

      const payload = {
        language: languageByQuestionId[question.id] || getDefaultLanguage(question),
        questionId: question.id,
        code: codeByQuestionId[question.id] || getStarterCode(question, languageByQuestionId[question.id] || getDefaultLanguage(question)),
        testCases: testcases
      }

      const res = await fetch(`${EXECUTION_SERVICE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Submit failed: ${res.status}`)
      }

      const json = await res.json()
      setRunResultByQuestionId((curr) => ({ ...curr, [question.id]: normalizeRoundResults(json) }))
    } catch (err) {
      alert(err.message || 'Submit failed')
    } finally {
      setSubmittingQuestionId(null)
    }
  }

  const startAptitude = () => {
    if (!application?.id) {
      alert('Application not found for aptitude round.')
      return
    }

    navigate(`/candidate/aptitude/${application.id}`, {
      state: {
        jobId: job?.id,
        aptitudeTime: job?.hiringPlan?.aptitudeTime || 20,
      },
    })
  }

  const handleRunQuestion = async (question) => {
    if (!question?.id) return
    setRunningQuestionId(question.id)
    try {
      const payload = {
        language: languageByQuestionId[question.id] || getDefaultLanguage(question),
        questionId: question.id,
        code: codeByQuestionId[question.id] || getStarterCode(question, languageByQuestionId[question.id] || getDefaultLanguage(question)),
        testCases: question.visibleTestCases || []
      }

      const res = await fetch(`${EXECUTION_SERVICE_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Run failed: ${res.status}`)
      }

      const json = await res.json()
      setRunResultByQuestionId((curr) => ({ ...curr, [question.id]: normalizeRoundResults(json) }))
      setSuccessfulSubmissionByQuestionId((curr) => ({ ...curr, [question.id]: false }))
    } catch (err) {
      alert(err.message || 'Run failed')
    } finally {
      setRunningQuestionId(null)
    }
  }

  const handleSubmitTechnicalRound = async () => {
    if (!allTechnicalQuestionsSubmitted) {
      setUpdateError('Submit each coding question to verify hidden test cases before completing the round.')
      return
    }

    setSubmittingTechnical(true)
    try {
      // mark technical round complete (fallback behavior uses completeRound from context)
      await completeRound(job.id, job, 'dsaSql', 100)
      setUpdateError('')
    } catch (err) {
      alert(err.message || 'Failed to submit technical round')
    } finally {
      setSubmittingTechnical(false)
    }
  }

          const stageCards = roundSequence.map((stageKey) => {
        // avoid performing state updates during render; validation is handled when submitting

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
      <button onClick={() => navigate('/candidate/applications')} className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 font-semibold">
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
          ) : aptitudeFailed ? (
            <div className="text-center py-10">
              <ShieldCheck size={48} className="mx-auto text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800 mt-4">Failed to clear aptitude round</h2>
              <p className="text-gray-600 mt-2">You need at least 65% to pass aptitude. This application is now marked as failed.</p>
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

              <div className="rounded-lg border p-6 bg-white">
                <p className="mb-4 text-sm text-gray-600">Instructions</p>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 mb-4">
                  <li>Read each question carefully and select the best answer.</li>
                  <li>You will have <strong>{job.hiringPlan?.aptitudeTime || 20} minutes</strong> to complete this round.</li>
                  <li>The camera opens on the aptitude screen and stays hidden from view.</li>
                  <li>Questions are fetched from the aptitude service when you start.</li>
                </ul>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">You will be redirected to the live aptitude test page.</div>
                  <button onClick={startAptitude} className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">Start Aptitude</button>
                </div>
              </div>
            </div>
          ) : currentStage === 'dsaSql' ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Code2 size={24} className="text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-800">DSA + SQL Round</h2>
              </div>
              <div className="mb-4 rounded-lg bg-purple-50 p-4 border border-purple-100 text-sm text-purple-900 space-y-1">
                <div>Questions are loaded from the seeded DSA question service.</div>
                <div>Run uses visible tests only. Submit evaluates visible plus hidden tests.</div>
                <div>Time limit: {configuredDsaSqlTime ? `${configuredDsaSqlTime} mins` : 'Not configured'}</div>
              </div>

              {!technicalRoundStarted && technicalQuestions.length === 0 ? (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                  <p className="text-sm text-purple-900 mb-4">You have cleared aptitude. Click below to start the DSA + SQL round and load your coding questions.</p>
                  <button
                    onClick={handleStartTechnicalRound}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold hover:from-purple-700 hover:to-fuchsia-700 transition-all"
                  >
                    Start DSA + SQL Round
                  </button>
                </div>
              ) : technicalLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">Loading coding questions...</div>
              ) : technicalError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">{technicalError}</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold">Question {currentTechnicalIndex + 1} of {technicalQuestions.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Use Next to skip or Previous to review earlier work.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousTechnicalQuestion}
                        disabled={currentTechnicalIndex === 0}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextTechnicalQuestion}
                        disabled={currentTechnicalIndex >= technicalQuestions.length - 1}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {currentTechnicalQuestion && (
                    <div key={currentTechnicalQuestion.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold">{currentTechnicalQuestion.topic} • {currentTechnicalQuestion.difficulty}</p>
                          <h3 className="text-xl font-bold text-gray-800 mt-1">{currentTechnicalIndex + 1}. {currentTechnicalQuestion.title}</h3>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{currentTechnicalQuestion.timeLimitMs} ms</div>
                          <div>{currentTechnicalQuestion.memoryLimitMb} MB</div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 leading-6 whitespace-pre-line">{currentTechnicalQuestion.statement}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                          <p className="font-semibold text-gray-800 mb-2">Constraints</p>
                          <p className="text-gray-600 whitespace-pre-line">{currentTechnicalQuestion.constraintsText}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                          <p className="font-semibold text-gray-800 mb-2">Input / Output</p>
                          <p className="text-gray-600 whitespace-pre-line"><span className="font-semibold text-gray-700">Input:</span> {currentTechnicalQuestion.inputFormat}</p>
                          <p className="text-gray-600 whitespace-pre-line mt-2"><span className="font-semibold text-gray-700">Output:</span> {currentTechnicalQuestion.outputFormat}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                        <p className="font-semibold text-blue-900 mb-2">Visible Test Cases</p>
                        <div className="space-y-2 text-sm text-blue-950">
                          {(currentTechnicalQuestion.visibleTestCases || []).map((testCase, testIndex) => (
                            <div key={testCase.id || testIndex} className="rounded-md bg-white/80 border border-blue-100 p-3">
                              <div className="font-mono text-xs text-blue-700 mb-1">Input</div>
                              <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">{testCase.inputData}</pre>
                              <div className="font-mono text-xs text-blue-700 mt-2 mb-1">Expected Output</div>
                              <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">{testCase.expectedOutput}</pre>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="text-sm font-semibold text-gray-700">Language</label>
                        <select
                          value={languageByQuestionId[currentTechnicalQuestion.id] || getDefaultLanguage(currentTechnicalQuestion)}
                          onChange={(event) => {
                            const nextLanguage = event.target.value
                            setLanguageByQuestionId((current) => ({ ...current, [currentTechnicalQuestion.id]: nextLanguage }))
                            setCodeByQuestionId((current) => ({
                              ...current,
                              [currentTechnicalQuestion.id]: getStarterCode(currentTechnicalQuestion, nextLanguage)
                            }))
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          {currentTechnicalQuestion.topic === 'SQL' ? (
                            <option value="sql">SQL</option>
                          ) : (
                            <>
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                              <option value="java">Java</option>
                            </>
                          )}
                        </select>
                        <button
                          onClick={() => handleRunQuestion(currentTechnicalQuestion)}
                          disabled={runningQuestionId === currentTechnicalQuestion.id || submittingQuestionId === currentTechnicalQuestion.id}
                          className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {runningQuestionId === currentTechnicalQuestion.id ? 'Running...' : 'Run'}
                        </button>
                        <button
                          onClick={handleSubmitCurrentQuestion}
                          disabled={submittingQuestionId === currentTechnicalQuestion.id || runningQuestionId === currentTechnicalQuestion.id}
                          className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {submittingQuestionId === currentTechnicalQuestion.id ? 'Submitting...' : 'Submit Question'}
                        </button>
                      </div>

                      <textarea
                        value={codeByQuestionId[currentTechnicalQuestion.id] || getStarterCode(currentTechnicalQuestion, languageByQuestionId[currentTechnicalQuestion.id] || getDefaultLanguage(currentTechnicalQuestion))}
                        onChange={(event) => setCodeByQuestionId((current) => ({ ...current, [currentTechnicalQuestion.id]: event.target.value }))}
                        className="mt-4 w-full h-72 rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        spellCheck="false"
                      />

                      {runResultByQuestionId[currentTechnicalQuestion.id] && (
                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="font-semibold">Run Result: {runResultByQuestionId[currentTechnicalQuestion.id].verdict}</div>
                            <div className="text-xs text-emerald-800">{runResultByQuestionId[currentTechnicalQuestion.id].passed} / {runResultByQuestionId[currentTechnicalQuestion.id].total} passed {runResultByQuestionId[currentTechnicalQuestion.id].executionTimeMs ? `• ${runResultByQuestionId[currentTechnicalQuestion.id].executionTimeMs} ms` : ''}</div>
                          </div>
                          {runResultByQuestionId[currentTechnicalQuestion.id].results?.length > 0 ? (
                            <div className="space-y-3 mt-3">
                              {runResultByQuestionId[currentTechnicalQuestion.id].results.map((result, resultIndex) => (
                                <div key={`${currentTechnicalQuestion.id}-${resultIndex}`} className={`rounded-lg border p-3 ${result.passed ? 'border-emerald-200 bg-white' : 'border-red-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-2 mb-2 text-xs font-semibold uppercase tracking-wide">
                                    <span className={result.hidden ? 'text-amber-700' : 'text-sky-700'}>{result.hidden ? 'Hidden Test' : 'Visible Test'} {resultIndex + 1}</span>
                                    <span className={result.passed ? 'text-emerald-700' : 'text-red-700'}>{result.passed ? 'Passed' : 'Failed'}</span>
                                  </div>
                                  {result.hidden ? (
                                    <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${result.passed ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                                      {result.passed ? 'Hidden test case passed' : 'Hidden test case failed'}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div>
                                        <div className="font-semibold text-gray-600 mb-1">Input</div>
                                        <pre className="whitespace-pre-wrap font-mono bg-gray-50 rounded-md p-2 border border-gray-100 text-gray-800">{result.inputData}</pre>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-600 mb-1">Expected</div>
                                        <pre className="whitespace-pre-wrap font-mono bg-gray-50 rounded-md p-2 border border-gray-100 text-gray-800">{result.expectedOutput}</pre>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-gray-600 mb-1">Actual</div>
                                        <pre className="whitespace-pre-wrap font-mono bg-gray-50 rounded-md p-2 border border-gray-100 text-gray-800">{result.actualOutput}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {runResultByQuestionId[currentTechnicalQuestion.id].stdout ? <pre className="whitespace-pre-wrap font-mono text-xs bg-white/70 border border-emerald-100 p-3 rounded-md mt-3">{runResultByQuestionId[currentTechnicalQuestion.id].stdout}</pre> : null}
                          {runResultByQuestionId[currentTechnicalQuestion.id].stderr ? <pre className="whitespace-pre-wrap font-mono text-xs bg-white/70 border border-emerald-100 p-3 rounded-md mt-3 text-red-700">{runResultByQuestionId[currentTechnicalQuestion.id].stderr}</pre> : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmitTechnicalRound}
                disabled={submittingTechnical || technicalQuestions.length === 0 || !allTechnicalQuestionsSubmitted}
                className="mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold hover:from-purple-700 hover:to-fuchsia-700 transition-all disabled:opacity-60"
              >
                {submittingTechnical ? 'Submitting...' : allTechnicalQuestionsSubmitted ? 'Submit DSA + SQL Round' : 'Submit hidden tests first'}
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
