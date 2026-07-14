import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Code2, ChevronLeft, ChevronRight, PlayCircle, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useJobs } from '../context/JobContext.jsx'
import { getNextRound, useCandidateApplications } from '../context/CandidateApplicationContext.jsx'
import { authenticatedFetch } from '../api/authApi.js'
import { completeProctoringSession, createProctoringSession, logProctoringEvent } from '../api/antiCheatApi.js'
import { QUESTION_SERVICE_URL, EXECUTION_SERVICE_URL, JOB_SERVICE_URL } from '../config/serviceUrls.js'
import { buildFallbackJobFromApplication } from '../utils/jobFallback.js'

function parseTopics(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

function getTechnicalPlan(job) {
  return job?.hiringPlan?.technicalConfig || job?.hiringPlan || {}
}

function getStarterCode(question, language) {
  const normalized = (language || '').toLowerCase()

  if (normalized === 'java') {
    return question?.starterCodeJava || 'public class Main {\n    public static void main(String[] args) throws Exception {\n\n    }\n}'
  }

  if (normalized === 'cpp') {
    return question?.starterCodeCpp || '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n'
  }

  if (normalized === 'sql') {
    return question?.starterCodeSql || '-- Write your SQL query here\n'
  }

  return question?.starterCodePython || 'import sys\n\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n'
}

function getDefaultLanguage(question) {
  return (question?.topic || '').toLowerCase() === 'sql' ? 'sql' : 'python'
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
  const plan = getTechnicalPlan(job)

  return {
    applicationId,
    jobId: job?.id,
    dsaCount: Number(plan.dsaQuestions ?? plan.dsaCount ?? 0),
    dsaTopics: parseTopics(plan.dsaTopics),
    dsaDifficulty: plan.dsaDifficulty || 'medium',
    sqlCount: Number(plan.sqlQuestions ?? plan.sqlCount ?? 0),
    sqlTopics: parseTopics(plan.sqlTopics),
    sqlDifficulty: plan.sqlDifficulty || 'medium'
  }
}

function getExecutionTimeoutSeconds(question) {
  const limitMs = Number(question?.timeLimitMs || 0)
  const baseSeconds = limitMs > 0 ? Math.ceil(limitMs / 1000) : 2
  return Math.max(5, baseSeconds + 3)
}

export default function CandidateTechnicalRound() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs } = useJobs()
  const { getApplicationByJobId, completeRound, getNextRound } = useCandidateApplications()

  const [fullJob, setFullJob] = useState(null)

  useEffect(() => {
    let mounted = true
    async function fetchFullJob() {
      try {
        const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${jobId}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setFullJob(data)
        }
      } catch (err) {
        console.error('Failed to fetch full job config:', err)
      }
    }
    if (jobId) {
      fetchFullJob()
    }
    return () => { mounted = false }
  }, [jobId])

  const application = getApplicationByJobId(jobId)
  const baseJob = jobs.find((item) => String(item.id) === String(jobId)) || buildFallbackJobFromApplication(application) || {}

  const job = useMemo(() => {
    if (!fullJob) return baseJob

    const hiringPlan = {
      skills: fullJob.skills ? (Array.isArray(fullJob.skills) ? fullJob.skills.join(', ') : fullJob.skills) : undefined,
      requiredExperienceYears: fullJob.requiredExperienceYears ?? null,
      aptitudeEnabled: fullJob.jobRounds?.aptitudeEnabled ?? fullJob.aptitudeEnabled ?? false,
      aptitudeQuestions: fullJob.aptitudeConfig?.numQuestions ?? null,
      aptitudeQuestionType: fullJob.aptitudeConfig?.type ?? 'mcq',
      aptitudeTopics: fullJob.aptitudeConfig?.topics ?? '',
      aptitudeTime: fullJob.aptitudeConfig?.time ?? null,
      dsaSqlEnabled: fullJob.jobRounds?.technicalEnabled ?? fullJob.technicalEnabled ?? false,
      dsaQuestions: fullJob.technicalConfig?.dsaQuestions ?? null,
      sqlQuestions: fullJob.technicalConfig?.sqlQuestions ?? null,
      dsaTopics: fullJob.technicalConfig?.dsaTopics ?? '',
      sqlTopics: fullJob.technicalConfig?.sqlTopics ?? '',
      dsaDifficulty: fullJob.technicalConfig?.dsaDifficulty ?? 'medium',
      sqlDifficulty: fullJob.technicalConfig?.sqlDifficulty ?? 'medium',
      dsaSqlTime: fullJob.technicalConfig?.time ?? null,
      aiEnabled: fullJob.jobRounds?.interviewEnabled ?? fullJob.interviewEnabled ?? false,
      aiTime: fullJob.interviewConfig?.duration ?? null,
      aiTopics: fullJob.interviewConfig?.topics ?? ''
    }

    return {
      ...baseJob,
      hiringPlan
    }
  }, [baseJob, fullJob])

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [codeByQuestionId, setCodeByQuestionId] = useState({})
  const [languageByQuestionId, setLanguageByQuestionId] = useState({})
  const [resultByQuestionId, setResultByQuestionId] = useState({})
  const [successfulSubmissionByQuestionId, setSuccessfulSubmissionByQuestionId] = useState({})
  const [runningQuestionId, setRunningQuestionId] = useState(null)
  const [submittingQuestionId, setSubmittingQuestionId] = useState(null)
  const [submittingRound, setSubmittingRound] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const autoSubmitTriggeredRef = useRef(false)
  const antiCheatSessionRef = useRef(null)
  const antiCheatCompletedRef = useRef(false)
  const antiCheatStartedRef = useRef(false)

  const antiCheatScopeId = application?.id || job?.id || jobId
  const antiCheatStorageKey = antiCheatScopeId ? `antiCheatSession:${antiCheatScopeId}:DSA_SQL` : null

  const currentQuestion = questions[currentIndex] || null

  useEffect(() => {
    let mounted = true

    const startAntiCheatSession = async () => {
      if (!antiCheatStorageKey || antiCheatStartedRef.current) {
        return
      }

      const candidateId = application?.candidateId
      const assessmentId = job?.id || jobId

      if (!candidateId || !assessmentId) {
        return
      }

      antiCheatStartedRef.current = true

      try {
        const cachedSessionId = window.localStorage.getItem(antiCheatStorageKey)
        if (cachedSessionId) {
          antiCheatSessionRef.current = cachedSessionId
          return
        }

        const response = await createProctoringSession({
          candidateId,
          assessmentId,
          assessmentType: 'DSA_SQL'
        })

        if (!mounted || !response?.sessionId) {
          return
        }

        antiCheatSessionRef.current = response.sessionId
        window.localStorage.setItem(antiCheatStorageKey, response.sessionId)
      } catch (err) {
        console.warn('Unable to start anti-cheat session for technical round', err)
      }
    }

    startAntiCheatSession()

    return () => {
      mounted = false
    }
  }, [antiCheatStorageKey, application?.candidateId, job?.id, jobId])

  useEffect(() => {
    const antiCheatEventsKey = antiCheatStorageKey ? `${antiCheatStorageKey}:events` : null

    const readQueuedEvents = () => {
      if (!antiCheatEventsKey) return []
      try {
        const raw = window.localStorage.getItem(antiCheatEventsKey)
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    }

    const writeQueuedEvents = (events) => {
      if (!antiCheatEventsKey) return
      try {
        window.localStorage.setItem(antiCheatEventsKey, JSON.stringify(events))
      } catch {
        // ignore storage errors
      }
    }

    const enqueueEvent = (event) => {
      const queue = readQueuedEvents()
      queue.push(event)
      writeQueuedEvents(queue)
    }

    const sendEvent = async (sessionId, event) => {
      try {
        await logProctoringEvent(sessionId, event.eventType, event.metadata)
        return true
      } catch (err) {
        console.warn('Unable to send queued anti-cheat event', err)
        return false
      }
    }

    const flushQueuedEvents = async () => {
      const sessionId = antiCheatSessionRef.current
      if (!sessionId) return
      const queue = readQueuedEvents()
      if (!Array.isArray(queue) || queue.length === 0) return

      const remaining = []
      for (const ev of queue) {
        // try to send sequentially to preserve order
        // eslint-disable-next-line no-await-in-loop
        const ok = await sendEvent(sessionId, ev)
        if (!ok) {
          remaining.push(ev)
        }
      }

      if (remaining.length === 0) {
        try {
          window.localStorage.removeItem(antiCheatEventsKey)
        } catch {}
      } else {
        writeQueuedEvents(remaining)
      }
    }

    const logEvent = (eventType, metadata) => {
      if (antiCheatCompletedRef.current) return

      const payload = {
        eventType,
        metadata: metadata || eventType,
        timestamp: Date.now()
      }

      // If session exists, attempt immediate send and fall back to queue
      const sessionId = antiCheatSessionRef.current
      if (sessionId) {
        logProctoringEvent(sessionId, eventType, payload.metadata).then(() => {
          // flush any queued events afterward
          flushQueuedEvents().catch(() => {})
        }).catch(() => {
          enqueueEvent(payload)
        })
      } else {
        // queue until session created
        enqueueEvent(payload)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logEvent('TAB_SWITCH', 'candidate switched browser tab')
      }
    }

    const handleBlur = () => logEvent('WINDOW_BLUR', 'window lost focus')
    const handleFocus = () => logEvent('WINDOW_FOCUS', 'window regained focus')
    const handleFullscreenChange = () => {
      logEvent(document.fullscreenElement ? 'FULLSCREEN_ENTER' : 'FULLSCREEN_EXIT', 'fullscreen state changed')
    }
    const handleCopy = (event) => {
      try {
        event.preventDefault()
      } catch {}
      logEvent('COPY_ATTEMPT', 'copy shortcut or menu used')
    }

    const handlePaste = (event) => {
      try {
        event.preventDefault()
      } catch {}
      logEvent('PASTE_ATTEMPT', 'paste shortcut or menu used')
    }

    const handleCut = (event) => {
      try {
        event.preventDefault()
      } catch {}
      logEvent('CUT_ATTEMPT', 'cut shortcut or menu used')
    }

    const handleContextMenu = (event) => {
      try {
        event.preventDefault()
      } catch {}
      logEvent('RIGHT_CLICK_ATTEMPT', 'right click attempt detected')
    }

    const handleKeyDown = (event) => {
      // block common copy/paste/cut shortcuts: Ctrl/Cmd+C/V/X and Shift+Insert
      const key = (event.key || '').toLowerCase()
      const isCtrl = event.ctrlKey || event.metaKey
      if ((isCtrl && (key === 'c' || key === 'v' || key === 'x')) || (event.shiftKey && key === 'insert')) {
        try {
          event.preventDefault()
        } catch {}
        if (key === 'c') logEvent('COPY_ATTEMPT', 'keyboard copy shortcut')
        if (key === 'v') logEvent('PASTE_ATTEMPT', 'keyboard paste shortcut')
        if (key === 'x') logEvent('CUT_ATTEMPT', 'keyboard cut shortcut')
      }
    }

    const handlePageExit = () => {
      const sessionId = antiCheatSessionRef.current
      if (!sessionId || antiCheatCompletedRef.current) {
        return
      }

      completeProctoringSession(sessionId).catch((err) => {
        console.warn('Unable to complete anti-cheat session', err)
      })

      antiCheatCompletedRef.current = true
      if (antiCheatStorageKey) {
        window.localStorage.removeItem(antiCheatStorageKey)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pagehide', handlePageExit)
    window.addEventListener('beforeunload', handlePageExit)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pagehide', handlePageExit)
      window.removeEventListener('beforeunload', handlePageExit)
    }
  }, [antiCheatStorageKey])

  useEffect(() => {
    let mounted = true
    let notFoundTimer = null

    const loadQuestions = async () => {
      if (!job?.id) return

      setLoading(true)
      setError('')

      // storage keys scoped by application/job
      const scopeId = application?.id || job?.id || jobId
      const assignedKey = `dsaSqlAssigned:${scopeId}`
      const timerKey = `dsaSqlTimerStartedAt:${scopeId}`

      try {
        // If we have assigned questions in localStorage, reuse them to survive refresh
        const cached = window.localStorage.getItem(assignedKey)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            const nextQuestions = Array.isArray(parsed?.questions) ? parsed.questions : parsed
            if (Array.isArray(nextQuestions) && nextQuestions.length > 0) {
              if (!mounted) return
              setQuestions(nextQuestions)
              const nextCodes = {}
              const nextLanguages = {}
              nextQuestions.forEach((question) => {
                const language = getDefaultLanguage(question)
                nextLanguages[question.id] = language
                nextCodes[question.id] = getStarterCode(question, language)
              })
              setLanguageByQuestionId(nextLanguages)
              setCodeByQuestionId(nextCodes)
              setCurrentIndex(0)

              // ensure timer start exists
              const startedAt = Number(window.localStorage.getItem(timerKey) || 0)
              if (!Number.isFinite(startedAt) || startedAt <= 0) {
                // if cache included an assignedAt timestamp, use it; otherwise use now
                const assignedAt = Number(parsed.assignedAt || 0) || Date.now()
                window.localStorage.setItem(timerKey, String(assignedAt))
              }

              return
            }
          } catch (e) {
            // fall through to assign
          }
        }

        // No cache — request assignment from question service
        const assignReq = buildTechnicalAssignRequest(application?.id || job.id, job)
        const res = await authenticatedFetch(`${QUESTION_SERVICE_URL}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignReq)
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Assign failed: ${res.status}`)
        }

        const payload = await res.json()
        const nextQuestions = Array.isArray(payload) ? payload : (payload.questions || [])

        if (!mounted) return

        setQuestions(nextQuestions)
        const nextCodes = {}
        const nextLanguages = {}
        nextQuestions.forEach((question) => {
          const language = getDefaultLanguage(question)
          nextLanguages[question.id] = language
          nextCodes[question.id] = getStarterCode(question, language)
        })
        setLanguageByQuestionId(nextLanguages)
        setCodeByQuestionId(nextCodes)
        setCurrentIndex(0)

        // persist assigned questions and record assignedAt for timer consistency
        try {
          const assignedAt = Date.now()
          window.localStorage.setItem(assignedKey, JSON.stringify({ questions: nextQuestions, assignedAt }))
          // only set timer if not already set
          const existing = Number(window.localStorage.getItem(timerKey) || 0)
          if (!Number.isFinite(existing) || existing <= 0) {
            window.localStorage.setItem(timerKey, String(assignedAt))
          }
        } catch (e) {
          // ignore storage errors
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load coding questions')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (job?.id && fullJob) {
      loadQuestions()
    } else if (job?.id && !fullJob) {
      setLoading(true)
    } else {
      notFoundTimer = setTimeout(() => {
        if (mounted && !job?.id) {
          setLoading(false)
          setError('Application not found')
        }
      }, 2000)
    }

    return () => {
      mounted = false
      if (notFoundTimer) {
        clearTimeout(notFoundTimer)
      }
    }
  }, [job?.id, fullJob])

  const navigateBack = () => {
    const targetJobId = application?.jobId || job?.id || jobId
    const applicationFlowPath = targetJobId ? `/candidate/applications/${targetJobId}` : '/candidate/applications'
    navigate(applicationFlowPath)
  }

  const completeAntiCheatRound = async () => {
    const sessionId = antiCheatSessionRef.current
    if (!sessionId || antiCheatCompletedRef.current) {
      return
    }

    antiCheatCompletedRef.current = true

    try {
      await completeProctoringSession(sessionId)
    } catch (err) {
      console.warn('Unable to complete anti-cheat session', err)
    } finally {
      if (antiCheatStorageKey) {
        window.localStorage.removeItem(antiCheatStorageKey)
      }
    }
  }

  const handleRunQuestion = async (question) => {
    if (!question?.id) return
    setRunningQuestionId(question.id)
    try {
      const payload = {
        language: languageByQuestionId[question.id] || getDefaultLanguage(question),
        questionId: question.id,
        code: codeByQuestionId[question.id] || getStarterCode(question, languageByQuestionId[question.id] || getDefaultLanguage(question)),
        testCases: question.visibleTestCases || question.testCases || [],
        timeoutSeconds: getExecutionTimeoutSeconds(question)
      }

      const res = await fetch(`${EXECUTION_SERVICE_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Run failed: ${res.status}`)
      }

      const json = await res.json()
      setResultByQuestionId((current) => ({ ...current, [question.id]: normalizeRoundResults(json) }))
      setSuccessfulSubmissionByQuestionId((current) => ({ ...current, [question.id]: false }))
    } catch (err) {
      setResultByQuestionId((current) => ({
        ...current,
        [question.id]: {
          passed: 0,
          total: 0,
          verdict: 'Error',
          stdout: '',
          stderr: err.message || 'Run failed',
          executionTimeMs: 0,
          results: []
        }
      }))
    } finally {
      setRunningQuestionId(null)
    }
  }

  const handleSubmitQuestion = async () => {
    if (!currentQuestion?.id) return
    setSubmittingQuestionId(currentQuestion.id)
    try {
      const testCaseRes = await authenticatedFetch(`${QUESTION_SERVICE_URL}/${currentQuestion.id}/test-cases`)
      if (!testCaseRes.ok) {
        const text = await testCaseRes.text()
        throw new Error(text || `Failed to load test cases: ${testCaseRes.status}`)
      }

      const testCases = await testCaseRes.json()
      const payload = {
        language: languageByQuestionId[currentQuestion.id] || getDefaultLanguage(currentQuestion),
        questionId: currentQuestion.id,
        code: codeByQuestionId[currentQuestion.id] || getStarterCode(currentQuestion, languageByQuestionId[currentQuestion.id] || getDefaultLanguage(currentQuestion)),
        testCases,
        timeoutSeconds: getExecutionTimeoutSeconds(currentQuestion)
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
      setResultByQuestionId((current) => ({ ...current, [currentQuestion.id]: normalizeRoundResults(json) }))
      setSuccessfulSubmissionByQuestionId((current) => ({ ...current, [currentQuestion.id]: didPassHiddenTests(json) }))
    } catch (err) {
      setResultByQuestionId((current) => ({
        ...current,
        [currentQuestion.id]: {
          passed: 0,
          total: 0,
          verdict: 'Error',
          stdout: '',
          stderr: err.message || 'Submit failed',
          executionTimeMs: 0,
          results: []
        }
      }))
      setSuccessfulSubmissionByQuestionId((current) => ({ ...current, [currentQuestion.id]: false }))
    } finally {
      setSubmittingQuestionId(null)
    }
  }

  const handleSubmitRound = async (options = {}) => {
    const forced = Boolean(options.force)
    if (!forced && !allQuestionsSubmitted) {
      setError('Submit each question successfully before completing the round.')
      return
    }

    setSubmittingRound(true)
    try {
      const passedCount = questions.filter((question) => successfulSubmissionByQuestionId[question.id]).length
      const timedOutScore = questions.length > 0 ? Math.round((passedCount / questions.length) * 100) : 0
      await completeRound(job.id, job, 'dsaSql', forced ? timedOutScore : 100)
      await completeAntiCheatRound()
      // clear persisted assigned questions and timer on submit
      try {
        const scopeId = application?.id || job?.id || jobId
        if (scopeId) {
          window.localStorage.removeItem(`dsaSqlAssigned:${scopeId}`)
          window.localStorage.removeItem(`dsaSqlTimerStartedAt:${scopeId}`)
        }
      } catch (e) {
        // ignore
      }
      navigateBack()
    } catch (err) {
      setError(err.message || 'Failed to submit round')
    } finally {
      setSubmittingRound(false)
    }
  }

  const roundLabel = useMemo(() => {
    const nextStage = getNextRound(job, application?.progress || [])
    return nextStage === 'aiInterview' ? 'Technical round completed' : 'DSA + SQL Round'
  }, [application?.progress, job])

  const configuredDsaSqlTime = useMemo(() => {
    const plan = getTechnicalPlan(job)
    const minutes = Number(
      job?.hiringPlan?.dsaSqlTime
        ?? plan?.dsaSqlTime
        ?? plan?.timeLimitMinutes
        ?? 0
    )
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null
  }, [job])

  const timerStorageKey = useMemo(() => {
    const scopeId = application?.id || job?.id || jobId
    return scopeId ? `dsaSqlTimerStartedAt:${scopeId}` : null
  }, [application?.id, job?.id, jobId])

  useEffect(() => {
    if (!timerStorageKey) {
      setRemainingSeconds(null)
      return
    }

    // use configured minutes, or default to 75 minutes when not provided
    const effectiveMinutes = configuredDsaSqlTime || 75
    const totalSeconds = effectiveMinutes * 60
    let startedAt = Number(window.localStorage.getItem(timerStorageKey) || 0)
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Number(window.localStorage.getItem(`dsaSqlAssigned:${application?.id || job?.id || jobId}`) || 0) || Date.now()
      window.localStorage.setItem(timerStorageKey, String(startedAt))
    }

    const endsAt = startedAt + (totalSeconds * 1000)

    const updateRemaining = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemainingSeconds(left)
    }

    updateRemaining()
    const intervalId = window.setInterval(updateRemaining, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [configuredDsaSqlTime, timerStorageKey])

  const remainingTimeLabel = useMemo(() => {
    if (remainingSeconds === null) {
      return null
    }

    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [remainingSeconds])

  const allQuestionsSubmitted = questions.length > 0 && questions.every((question) => successfulSubmissionByQuestionId[question.id])
  const timeExpired = remainingSeconds === 0

  useEffect(() => {
    if (!timeExpired || loading || submittingRound || autoSubmitTriggeredRef.current) {
      return
    }

    autoSubmitTriggeredRef.current = true
    setError('Time is up. Submitting your DSA + SQL round automatically...')
    handleSubmitRound({ force: true }).catch((err) => {
      autoSubmitTriggeredRef.current = false
      setError(err?.message || 'Time is up, but auto-submit failed. Please submit manually.')
    })
  }, [timeExpired, loading, submittingRound])

  return (
    <div className="min-h-[calc(100vh-1rem)] bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button onClick={navigateBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowLeft size={18} />
            Back to application
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">LeetCode-style round</p>
            <h1 className="text-xl font-bold text-slate-900">{job.title || 'Coding Round'}</h1>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{application?.candidateName || 'Candidate'}</div>
            <div>{roundLabel}</div>
            {configuredDsaSqlTime ? <div>Configured time: {configuredDsaSqlTime} mins</div> : null}
            {remainingTimeLabel ? <div className={remainingSeconds === 0 ? 'font-semibold text-red-600' : 'font-semibold text-violet-700'}>Time left: {remainingTimeLabel}</div> : null}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">Loading coding questions...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">{error}</div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">No DSA/SQL questions were returned for this job.</div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <main className="space-y-4">
              {currentQuestion && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">{currentQuestion.topic} • {currentQuestion.difficulty}</div>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">{currentIndex + 1}. {currentQuestion.title}</h2>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{currentQuestion.timeLimitMs} ms</div>
                      <div>{currentQuestion.memoryLimitMb} MB</div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-900">Problem Statement</h3>
                      <p
                        className="whitespace-pre-line text-sm leading-6 text-slate-700"
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ userSelect: 'none' }}
                      >
                        {currentQuestion.statement}
                      </p>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Constraints</div>
                          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{currentQuestion.constraintsText}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Input / Output</div>
                          <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Input:</span> {currentQuestion.inputFormat}</p>
                          <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Output:</span> {currentQuestion.outputFormat}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                        <h4 className="text-sm font-semibold text-sky-900">Visible Test Cases</h4>
                        <div className="mt-3 space-y-3">
                          {(currentQuestion.visibleTestCases || []).map((testCase, index) => (
                            <div
                              key={testCase.id || index}
                              className="rounded-xl border border-sky-100 bg-white p-3 text-xs text-slate-700"
                              onCopy={(e) => e.preventDefault()}
                              onCut={(e) => e.preventDefault()}
                              onPaste={(e) => e.preventDefault()}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ userSelect: 'none' }}
                            >
                              <div className="font-semibold text-sky-700">Input</div>
                              <pre className="mt-1 whitespace-pre-wrap font-mono">{testCase.inputData}</pre>
                              <div className="mt-2 font-semibold text-sky-700">Expected Output</div>
                              <pre className="mt-1 whitespace-pre-wrap font-mono">{testCase.expectedOutput}</pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Code Editor</div>
                          <div className="mt-1 text-sm text-slate-300">Write your solution, run visible tests, then submit when done.</div>

                      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
                        Run checks only the visible examples. Submit Question evaluates hidden test cases too, and the round cannot be completed until every question passes submission.
                      </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
                            disabled={currentIndex === 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
                          >
                            <ChevronLeft size={14} /> Previous
                          </button>
                          <button
                            onClick={() => setCurrentIndex((value) => Math.min(value + 1, questions.length - 1))}
                            disabled={currentIndex >= questions.length - 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                        <label className="text-sm font-semibold text-slate-200">Language</label>
                        <select
                          value={languageByQuestionId[currentQuestion.id] || getDefaultLanguage(currentQuestion)}
                          onChange={(event) => {
                            const language = event.target.value
                            setLanguageByQuestionId((current) => ({ ...current, [currentQuestion.id]: language }))
                            setCodeByQuestionId((current) => ({ ...current, [currentQuestion.id]: getStarterCode(currentQuestion, language) }))
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                        >
                          {currentQuestion.topic === 'SQL' ? (
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
                          onClick={() => handleRunQuestion(currentQuestion)}
                          disabled={timeExpired || runningQuestionId === currentQuestion.id || submittingQuestionId === currentQuestion.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          <PlayCircle size={16} /> {runningQuestionId === currentQuestion.id ? 'Running...' : 'Run'}
                        </button>
                        <button
                          onClick={handleSubmitQuestion}
                          disabled={timeExpired || submittingQuestionId === currentQuestion.id || runningQuestionId === currentQuestion.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          <Send size={16} /> {submittingQuestionId === currentQuestion.id ? 'Submitting...' : 'Submit Question'}
                        </button>
                      </div>

                      <textarea
                        value={codeByQuestionId[currentQuestion.id] || getStarterCode(currentQuestion, languageByQuestionId[currentQuestion.id] || getDefaultLanguage(currentQuestion))}
                        onChange={(event) => setCodeByQuestionId((current) => ({ ...current, [currentQuestion.id]: event.target.value }))}
                        onPaste={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        disabled={timeExpired || submittingRound}
                        spellCheck="false"
                        className="min-h-[360px] w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-violet-500"
                      />

                      {successfulSubmissionByQuestionId[currentQuestion.id] && (
                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800">
                          <CheckCircle2 size={18} className="text-emerald-600" />
                          <span className="text-sm font-semibold">Successful submission: hidden test cases passed.</span>
                        </div>
                      )}

                      {resultByQuestionId[currentQuestion.id] && (
                        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/60 p-4 text-sm text-emerald-50">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">Run Result: {resultByQuestionId[currentQuestion.id].verdict}</div>
                            <div className="text-xs text-emerald-200">{resultByQuestionId[currentQuestion.id].passed} / {resultByQuestionId[currentQuestion.id].total} passed {resultByQuestionId[currentQuestion.id].executionTimeMs ? `• ${resultByQuestionId[currentQuestion.id].executionTimeMs} ms` : ''}</div>
                          </div>

                          {resultByQuestionId[currentQuestion.id].results?.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {resultByQuestionId[currentQuestion.id].results.map((result, index) => (
                                <div key={`${currentQuestion.id}-${index}`} className={`rounded-xl border p-3 ${result.passed ? 'border-emerald-700 bg-slate-950' : 'border-red-700 bg-slate-950'}`}>
                                  <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                                    <span className={result.hidden ? 'text-amber-300' : 'text-sky-300'}>{result.hidden ? 'Hidden Test' : 'Visible Test'} {index + 1}</span>
                                    <span className={result.passed ? 'text-emerald-300' : 'text-red-300'}>{result.passed ? 'Passed' : 'Failed'}</span>
                                  </div>
                                  {result.hidden ? (
                                    <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${result.passed ? 'border-emerald-700/60 text-emerald-300' : 'border-red-700/60 text-red-300'}`}>
                                      {result.passed ? 'Hidden test case passed' : 'Hidden test case failed'}
                                    </div>
                                  ) : (
                                    <div className="grid gap-3 text-xs md:grid-cols-3">
                                      <div>
                                        <div className="mb-1 font-semibold text-slate-300">Input</div>
                                        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-2 font-mono text-slate-200">{result.inputData}</pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 font-semibold text-slate-300">Expected</div>
                                        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-2 font-mono text-slate-200">{result.expectedOutput}</pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 font-semibold text-slate-300">Actual</div>
                                        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-2 font-mono text-slate-200">{result.actualOutput}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {resultByQuestionId[currentQuestion.id].stdout ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-emerald-900/40 bg-slate-950 p-3 font-mono text-xs text-emerald-100">{resultByQuestionId[currentQuestion.id].stdout}</pre> : null}
                          {resultByQuestionId[currentQuestion.id].stderr ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-red-900/40 bg-slate-950 p-3 font-mono text-xs text-red-200">{resultByQuestionId[currentQuestion.id].stderr}</pre> : null}
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm text-slate-600">
                      Save and navigate between questions. Submit the round when you are ready.
                    </div>
                    <button
                      onClick={handleSubmitRound}
                      disabled={timeExpired || submittingRound || !allQuestionsSubmitted}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {submittingRound ? 'Submitting...' : allQuestionsSubmitted ? 'Submit DSA + SQL Round' : 'Submit hidden tests first'}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}
