import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { authenticatedFetch } from '../api/authApi.js'
import { completeProctoringSession, createProctoringSession, logProctoringEvent } from '../api/antiCheatApi.js'
import { useCandidateApplications } from '../context/CandidateApplicationContext.jsx'
import { APPLICATION_SERVICE_URL } from '../config/serviceUrls.js'

export default function CandidateAptitude() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const submitLockRef = useRef(false)
  const submittedRef = useRef(false)
  const antiCheatSessionRef = useRef(null)
  const antiCheatCompletedRef = useRef(false)
  const antiCheatStartedRef = useRef(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const location = useLocation()
  const { getApplicationById } = useCandidateApplications()
  const application = getApplicationById(applicationId)
  const antiCheatScopeId = application?.id || application?.jobId || applicationId
  const antiCheatStorageKey = antiCheatScopeId ? `antiCheatSession:${antiCheatScopeId}:APTITUDE` : null

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

  useEffect(() => {
    let mounted = true

    const startAntiCheatSession = async () => {
      if (!antiCheatStorageKey || antiCheatStartedRef.current) {
        return
      }

      const candidateId = application?.candidateId
      const assessmentId = application?.jobId || applicationId

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
          assessmentType: 'APTITUDE'
        })

        if (!mounted || !response?.sessionId) {
          return
        }

        antiCheatSessionRef.current = response.sessionId
        window.localStorage.setItem(antiCheatStorageKey, response.sessionId)
      } catch (err) {
        console.warn('Unable to start anti-cheat session for aptitude round', err)
      }
    }

    startAntiCheatSession()

    return () => {
      mounted = false
    }
  }, [antiCheatStorageKey, application?.candidateId, application?.jobId, applicationId])

  useEffect(() => {
    const logEvent = (eventType, metadata) => {
      const sessionId = antiCheatSessionRef.current
      if (!sessionId || antiCheatCompletedRef.current) {
        return
      }

      logProctoringEvent(sessionId, eventType, metadata).catch((err) => {
        console.warn('Unable to log anti-cheat event', err)
      })
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
    const handleCopy = () => logEvent('COPY_ATTEMPT', 'copy shortcut or menu used')
    const handlePaste = () => logEvent('PASTE_ATTEMPT', 'paste shortcut or menu used')
    const handleCut = () => logEvent('CUT_ATTEMPT', 'cut shortcut or menu used')
    const handleContextMenu = (event) => {
      event.preventDefault()
      logEvent('RIGHT_CLICK_ATTEMPT', 'right click attempt detected')
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
      window.removeEventListener('pagehide', handlePageExit)
      window.removeEventListener('beforeunload', handlePageExit)
    }
  }, [antiCheatStorageKey])

  useEffect(() => {
    let mounted = true

    const start = async () => {
      setLoading(true)
      setError('')

      // Keep camera enabled for proctoring, but do not render a visible preview.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        console.warn('Camera start failed', err)
      }

      // Call backend to start aptitude and fetch questions
      try {
        const res = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/${applicationId}/round/aptitude/start`, { method: 'POST' })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.message || `HTTP ${res.status}`)
        }
        const data = await res.json()
        // data may contain questions array
        const q = data?.questions || data
        if (mounted) setQuestions(q || [])
        // Initialize timer from navigation state (fallback to 20 minutes)
        const aptitudeTime = (location.state && location.state.aptitudeTime) || 20
        if (mounted) setRemainingSeconds(Math.max(0, Math.floor(aptitudeTime) * 60))
      } catch (err) {
        setError(err.message || 'Failed to start aptitude')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    start()

    const markFailedOnExit = () => {
      if (submittedRef.current || submitLockRef.current || loading) {
        return
      }

      const token = localStorage.getItem('ai-hiring-platform-auth-token')
      if (!token) {
        return
      }

      const score = 0
      const url = `${APPLICATION_SERVICE_URL}/${applicationId}/round/aptitude/submit-score?score=${score}`
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        keepalive: true
      }).catch(() => {})
    }

    window.addEventListener('pagehide', markFailedOnExit)
    window.addEventListener('beforeunload', markFailedOnExit)

    return () => {
      mounted = false
      window.removeEventListener('pagehide', markFailedOnExit)
      window.removeEventListener('beforeunload', markFailedOnExit)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [applicationId])

  // Timer effect
  useEffect(() => {
    if (remainingSeconds <= 0) return
    const t = setInterval(() => setRemainingSeconds((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [remainingSeconds])

  // Auto-submit when timer ends
  useEffect(() => {
    if (remainingSeconds === 0 && questions.length > 0 && !loading && !submitting) {
      // compute and submit score
      handleSubmit()
    }
  }, [remainingSeconds, questions, loading, submitting])

  const handleSelect = (qIndex, optionIndex) => {
    setAnswers((a) => ({ ...a, [qIndex]: optionIndex }))
  }

  const handleSubmit = async () => {
    if (submitLockRef.current) {
      return
    }
    submitLockRef.current = true
    setSubmitting(true)

    // compute score if correctAnswerIndex is present
    let correct = 0
    questions.forEach((q, i) => {
      if (typeof q.correctAnswerIndex === 'number' && answers[i] === q.correctAnswerIndex) correct += 1
    })
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0

    try {
      const res = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/${applicationId}/round/aptitude/submit-score?score=${score}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to submit score: HTTP ${res.status}`)
      const updatedApplication = await res.json()
      const jobId = updatedApplication?.jobId || location.state?.jobId
      if (!jobId) {
        throw new Error('Application updated, but job id was missing in the response')
      }

      submittedRef.current = true
      await completeAntiCheatRound()

      // Redirect to the technical round page so the candidate enters the LeetCode-style coding interface.
      if (score >= 65) {
        navigate(`/candidate/technical/${jobId}`, { replace: true })
      } else {
        navigate(`/candidate/applications/${jobId}`, { replace: true })
      }
    } catch (err) {
      submitLockRef.current = false
      submittedRef.current = false
      setSubmitting(false)
      setError(err.message || 'Submit failed')
    }
  }

  return (
    <div className="p-8">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute -left-[9999px] top-0 h-px w-px opacity-0 pointer-events-none"
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Aptitude Round</h1>
          <span className="text-sm text-gray-600">Application: {applicationId}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 lg:col-span-3">
            {loading ? (
              <div className="p-6 bg-white rounded border text-center">Loading questions...</div>
            ) : error ? (
              <div className="p-6 bg-red-50 rounded border text-red-700">{error}</div>
            ) : (
              <div className="space-y-4">
                <div className="mb-3 rounded-lg bg-blue-50 p-3 border border-blue-100 text-sm text-blue-900 font-mono">
                  Time left: {Math.max(0, Math.floor(remainingSeconds / 60))}:{String(Math.max(0, remainingSeconds % 60)).padStart(2, '0')}
                </div>
                {questions.length === 0 && <div className="p-4 text-gray-600">No questions returned.</div>}
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="rounded-lg border p-4">
                    <p className="font-semibold mb-2">{idx + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(q.options || []).map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-2 p-2 rounded border ${answers[idx] === oi ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <input type="radio" name={`q-${idx}`} checked={answers[idx] === oi} onChange={() => handleSelect(idx, oi)} />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <button onClick={handleSubmit} disabled={submitting} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? 'Submitting...' : 'Submit Aptitude'}</button>
                  <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
