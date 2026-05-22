import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { authenticatedFetch } from '../api/authApi.js'

export default function CandidateAptitude() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const start = async () => {
      setLoading(true)
      setError('')

      // Start camera
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch (err) {
        // continue; camera may be blocked
        console.warn('Camera start failed', err)
      }

      // Call backend to start aptitude and fetch questions
      try {
        const res = await authenticatedFetch(`http://localhost:8083/api/applications/${applicationId}/round/aptitude/start`, { method: 'POST' })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.message || `HTTP ${res.status}`)
        }
        const data = await res.json()
        // data may contain questions array
        const q = data?.questions || data
        if (mounted) setQuestions(q || [])
      } catch (err) {
        setError(err.message || 'Failed to start aptitude')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    start()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [applicationId])

  const handleSelect = (qIndex, optionIndex) => {
    setAnswers((a) => ({ ...a, [qIndex]: optionIndex }))
  }

  const handleSubmit = async () => {
    // compute score if correctAnswerIndex is present
    let correct = 0
    questions.forEach((q, i) => {
      if (typeof q.correctAnswerIndex === 'number' && answers[i] === q.correctAnswerIndex) correct += 1
    })
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0

    try {
      const res = await authenticatedFetch(`http://localhost:8083/api/applications/${applicationId}/round/aptitude/submit-score?score=${score}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to submit score: HTTP ${res.status}`)
      // Navigate back to application flow
      navigate(`/candidate/applications/${(await res.json()).jobId || ''}`)
    } catch (err) {
      setError(err.message || 'Submit failed')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Aptitude Round</h1>
          <span className="text-sm text-gray-600">Application: {applicationId}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Proctoring Camera</h3>
            <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!videoRef.current && (
                <div className="text-white/80 text-center p-4">
                  <Camera size={40} className="mx-auto mb-2" />
                  <div className="text-sm">Camera preview</div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2">
            {loading ? (
              <div className="p-6 bg-white rounded border text-center">Loading questions...</div>
            ) : error ? (
              <div className="p-6 bg-red-50 rounded border text-red-700">{error}</div>
            ) : (
              <div className="space-y-4">
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
                  <button onClick={handleSubmit} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">Submit Aptitude</button>
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
