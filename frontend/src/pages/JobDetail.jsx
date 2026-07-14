import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Circle, Clock3 } from 'lucide-react'
import CandidateRow from '../components/CandidateRow.jsx'
import { useJobs } from '../context/JobContext.jsx'
import { authenticatedFetch } from '../api/authApi.js'
import { JOB_SERVICE_URL, APPLICATION_SERVICE_URL } from '../config/serviceUrls.js'

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, updateJob } = useJobs()
  const [remoteJob, setRemoteJob] = useState(null)

  const localJob = jobs.find((j) => String(j.id) === String(jobId))
  const job = localJob || remoteJob
  const [candidatesList, setCandidatesList] = useState([])
  const [editing, setEditing] = useState({ aptitude: false, technical: false, ai: false })
  const [temp, setTemp] = useState({})

  const startEdit = (round) => {
    const plan = job?.hiringPlan || {}
    if (round === 'aptitude') {
      setTemp({
        aptitudeQuestions: plan.aptitudeQuestions || 0,
        aptitudeQuestionType: plan.aptitudeQuestionType || 'mcq',
        aptitudeTopics: plan.aptitudeTopics || '',
        aptitudeTime: plan.aptitudeTime || 0
      })
    }
    if (round === 'technical') {
      setTemp({
        dsaQuestions: plan.dsaQuestions || 0,
        sqlQuestions: plan.sqlQuestions || 0,
        dsaTopics: plan.dsaTopics || '',
        sqlTopics: plan.sqlTopics || '',
        dsaSqlTime: plan.dsaSqlTime || 0
      })
    }
    if (round === 'ai') {
      setTemp({ aiTime: plan.aiTime || 0, aiTopics: plan.aiTopics || '' })
    }
    setEditing((e) => ({ ...e, [round]: true }))
  }

  const cancelEdit = (round) => {
    setEditing((e) => ({ ...e, [round]: false }))
    setTemp({})
  }

  const saveAptitude = async () => {
    const newPlan = { ...(job.hiringPlan || {}), aptitudeEnabled: true, aptitudeQuestions: Number(temp.aptitudeQuestions), aptitudeQuestionType: temp.aptitudeQuestionType, aptitudeTopics: temp.aptitudeTopics, aptitudeTime: Number(temp.aptitudeTime) }
    try { updateJob?.(job.id, { hiringPlan: newPlan }) } catch {}
    setEditing((e) => ({ ...e, aptitude: false }))
    setTemp({})
    // attempt to persist to backend if API supports updates
    try {
      const payload = {
        jobRounds: {
          aptitudeEnabled: true,
          technicalEnabled: job.hiringPlan?.dsaSqlEnabled || false,
          interviewEnabled: job.hiringPlan?.aiEnabled || false
        },
        aptitudeConfig: {
          numQuestions: Number(temp.aptitudeQuestions),
          topics: temp.aptitudeTopics,
          type: temp.aptitudeQuestionType,
          time: Number(temp.aptitudeTime)
        }
      }

      const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        console.warn('Aptitude save not persisted')
        alert('Failed to save Aptitude config on server')
      } else {
        alert('Aptitude config saved')
      }
    } catch {}
  }

  const saveTechnical = async () => {
    const newPlan = { ...(job.hiringPlan || {}), dsaSqlEnabled: true, dsaQuestions: Number(temp.dsaQuestions), sqlQuestions: Number(temp.sqlQuestions), dsaTopics: temp.dsaTopics, sqlTopics: temp.sqlTopics, dsaSqlTime: Number(temp.dsaSqlTime) }
    try { updateJob?.(job.id, { hiringPlan: newPlan }) } catch {}
    setEditing((e) => ({ ...e, technical: false }))
    setTemp({})
    try {
      const payload = {
        jobRounds: {
          aptitudeEnabled: job.hiringPlan?.aptitudeEnabled || false,
          technicalEnabled: true,
          interviewEnabled: job.hiringPlan?.aiEnabled || false
        },
        technicalConfig: {
          dsaQuestions: Number(temp.dsaQuestions),
          dsaTopics: temp.dsaTopics,
          sqlQuestions: Number(temp.sqlQuestions),
          sqlTopics: temp.sqlTopics,
          time: Number(temp.dsaSqlTime)
        }
      }

      const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        console.warn('Technical save not persisted')
        alert('Failed to save Technical config on server')
      } else {
        alert('Technical config saved')
      }
    } catch (e) {}
  }

  const saveAi = async () => {
    const newPlan = { ...(job.hiringPlan || {}), aiEnabled: true, aiTime: Number(temp.aiTime), aiTopics: temp.aiTopics }
    try { updateJob?.(job.id, { hiringPlan: newPlan }) } catch {}
    setEditing((e) => ({ ...e, ai: false }))
    setTemp({})
    try {
      const payload = {
        jobRounds: {
          aptitudeEnabled: job.hiringPlan?.aptitudeEnabled || false,
          technicalEnabled: job.hiringPlan?.dsaSqlEnabled || false,
          interviewEnabled: true
        },
        interviewConfig: {
          duration: Number(temp.aiTime),
          topics: temp.aiTopics
        }
      }

      const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        console.warn('AI save not persisted')
        alert('Failed to save AI config on server')
      } else {
        alert('AI config saved')
      }
    } catch (e) {}
  }

  if (!job) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Job not found</p>
      </div>
    )
  }

  useEffect(() => {
    let mounted = true
    // if job not found locally, or it lacks detailed round config, fetch full job from backend
    const lacksDetails = (j) => {
      if (!j?.hiringPlan) return true
      if (j.hiringPlan.aptitudeEnabled && (j.hiringPlan.aptitudeQuestions == null)) return true
      if (j.hiringPlan.dsaSqlEnabled && (j.hiringPlan.dsaQuestions == null || j.hiringPlan.sqlQuestions == null)) return true
      if (j.hiringPlan.aiEnabled && (j.hiringPlan.aiTime == null)) return true
      return false
    }

    if (( !localJob || lacksDetails(localJob) ) && !remoteJob) {
      ;(async () => {
        try {
          const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${jobId}`)
          if (!res.ok) return
          const data = await res.json()
          if (!mounted) return
          // map backend JobResponse to frontend job shape
          const mapped = {
            id: data.id,
            title: data.title,
            department: data.department,
            salary: data.salary,
            description: data.description,
            applicants: 0,
            status: 'active',
            hiringPlan: {
              skills: (data.skills || []).join(', '),
              aptitudeEnabled: data.jobRounds?.aptitudeEnabled || false,
              aptitudeQuestions: data.aptitudeConfig?.numQuestions || 0,
              aptitudeQuestionType: data.aptitudeConfig?.type || 'mcq',
              aptitudeTopics: data.aptitudeConfig?.topics || '',
              aptitudeTime: data.aptitudeConfig?.time || 0,
              dsaSqlEnabled: data.jobRounds?.technicalEnabled || false,
              dsaQuestions: data.technicalConfig?.dsaQuestions || 0,
              sqlQuestions: data.technicalConfig?.sqlQuestions || 0,
              dsaTopics: data.technicalConfig?.dsaTopics || '',
              sqlTopics: data.technicalConfig?.sqlTopics || '',
              dsaSqlTime: data.technicalConfig?.time || 0,
              aiEnabled: data.jobRounds?.interviewEnabled || false,
              aiTime: data.interviewConfig?.duration || 0,
              aiTopics: data.interviewConfig?.topics || ''
            }
          }

          setRemoteJob(mapped)
        } catch (e) {
          console.debug('Failed to load job details', e.message)
        }
      })()
    }

    return () => { mounted = false }
  }, [jobId, localJob, remoteJob])

  const evaluatedCount = candidatesList.filter((c) => c.status === 'evaluated').length
  const selectedCount = candidatesList.filter((c) => c.status === 'selected').length

  useEffect(() => {
    let mounted = true

    const loadApplications = async () => {
      try {
        const res = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/job/${jobId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return

        const mapped = data.map((app) => {
          const resumeScore = app.resumeScore || 0
          const aptitudeScore = app.aptitudeScore || 0
          const technicalScore = app.technicalScore || 0
          const interviewScore = app.interviewScore || 0
          const scoresArray = [resumeScore, aptitudeScore, technicalScore, interviewScore].filter((s) => s && s > 0)
          const overall = scoresArray.length ? Math.round(scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length) : Math.round(resumeScore || 0)

          let status = 'applied'
          if (app.overallStatus === 'SELECTED' || app.overallStatus === 'HIRED') status = 'selected'
          else if (app.overallStatus === 'REJECTED') status = 'rejected'
          else if (resumeScore && resumeScore > 0) status = 'evaluated'

          return {
            id: app.id,
            name: app.candidateId || app.candidateEmail || 'Candidate',
            email: app.candidateEmail || '',
            appliedDate: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '',
            status,
            scores: {
              resumeScreening: Math.round(resumeScore) || 0,
              aptitudeTest: Math.round(aptitudeScore) || 0,
              dsaRound: Math.round(technicalScore) || 0,
              aiInterview: Math.round(interviewScore) || 0,
              overallScore: overall
            }
          }
        })

        setCandidatesList(mapped)
      } catch (e) {
        console.debug('Failed to load applications for job', e.message)
      }
    }

    loadApplications()
    return () => { mounted = false }
  }, [jobId])

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-primary hover:text-blue-600 mb-6 font-semibold"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* Job Header */}
      <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{job.title}</h1>
            <p className="text-gray-600 text-lg">{job.department} • {job.salary}</p>
          </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  job.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {job.status === 'active' ? 'Active' : 'Closed'}
              </span>
              <button
                onClick={async () => {
                  const newStatus = job.status === 'active' ? 'closed' : 'active'
                  // update in local provider if available
                  try {
                    updateJob?.(job.id, { status: newStatus })
                  } catch {}
                  // if remoteJob present, update local copy
                  if (remoteJob) setRemoteJob({ ...remoteJob, status: newStatus })
                  // persist to backend
                  try {
                    const res = await authenticatedFetch(`${JOB_SERVICE_URL}/${job.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: newStatus })
                    })
                    if (!res.ok) {
                        console.warn('Server did not accept status update')
                        alert('Status update failed on server')
                      } else {
                        alert('Status updated')
                      }
                  } catch (e) {
                    console.debug('Status update failed', e.message)
                  }
                }}
                className="px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
              >
                Toggle Status
              </button>
            </div>
        </div>

        <p className="text-gray-700 mb-6">{job.description}</p>

        {job.hiringPlan && (
          <div className="space-y-6 pt-6 border-t border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Hiring Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 mb-1">Skills Needed</p>
                  <p className="font-semibold">{job.hiringPlan.skills}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 mb-1">Description</p>
                  <p className="font-semibold">{job.description}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Round Configuration</h2>
              <div className="space-y-4">
                {job.hiringPlan.aptitudeEnabled && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <CheckCircle2 size={18} className="text-green-600" />
                        Aptitude Round
                      </div>
                      {!editing.aptitude ? (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit('aptitude')} className="px-3 py-1 text-sm bg-gray-100 rounded">Edit</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveAptitude} className="px-3 py-1 text-sm bg-primary text-white rounded">Save</button>
                          <button onClick={() => cancelEdit('aptitude')} className="px-3 py-1 text-sm bg-gray-100 rounded">Cancel</button>
                        </div>
                      )}
                    </div>

                    {!editing.aptitude ? (
                      <>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Questions</p>
                              <p className="text-2xl font-bold text-primary">{job.hiringPlan.aptitudeQuestions}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Type</p>
                              <p className="text-lg font-semibold text-purple-700">{job.hiringPlan.aptitudeQuestionType?.toUpperCase() || 'MCQ'}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Duration</p>
                              <div className="flex items-center gap-2">
                                <Clock3 size={18} className="text-orange-600" />
                                <p className="text-lg font-semibold text-orange-700">{job.hiringPlan.aptitudeTime} min</p>
                              </div>
                            </div>
                          </div>
                          {job.hiringPlan.aptitudeTopics && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Topics</p>
                              <p className="text-gray-800">{job.hiringPlan.aptitudeTopics}</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm text-gray-500">Questions</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.aptitudeQuestions} onChange={(e) => setTemp((t) => ({ ...t, aptitudeQuestions: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Type</label>
                            <select className="w-full mt-1 p-2 border rounded" value={temp.aptitudeQuestionType} onChange={(e) => setTemp((t) => ({ ...t, aptitudeQuestionType: e.target.value }))}>
                              <option value="mcq">MCQ</option>
                              <option value="descriptive">Descriptive</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Time (mins)</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.aptitudeTime} onChange={(e) => setTemp((t) => ({ ...t, aptitudeTime: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Topics (comma separated)</label>
                          <input type="text" className="w-full mt-1 p-2 border rounded" value={temp.aptitudeTopics} onChange={(e) => setTemp((t) => ({ ...t, aptitudeTopics: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {job.hiringPlan.dsaSqlEnabled && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <CheckCircle2 size={18} className="text-blue-600" />
                        DSA + SQL Round
                      </div>
                      {!editing.technical ? (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit('technical')} className="px-3 py-1 text-sm bg-gray-100 rounded">Edit</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveTechnical} className="px-3 py-1 text-sm bg-primary text-white rounded">Save</button>
                          <button onClick={() => cancelEdit('technical')} className="px-3 py-1 text-sm bg-gray-100 rounded">Cancel</button>
                        </div>
                      )}
                    </div>

                    {!editing.technical ? (
                      <>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">DSA Qs</p>
                              <p className="text-2xl font-bold text-primary">{job.hiringPlan.dsaQuestions}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">SQL Qs</p>
                              <p className="text-2xl font-bold text-primary">{job.hiringPlan.sqlQuestions}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Duration</p>
                              <div className="flex items-center gap-2">
                                <Clock3 size={18} className="text-orange-600" />
                                <p className="text-lg font-semibold text-orange-700">{job.hiringPlan.dsaSqlTime} min</p>
                              </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Status</p>
                              <span className="inline-block bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Enabled</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {job.hiringPlan.dsaTopics && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">DSA Topics</p>
                                <p className="text-gray-800">{job.hiringPlan.dsaTopics}</p>
                              </div>
                            )}
                            {job.hiringPlan.sqlTopics && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">SQL Topics</p>
                                <p className="text-gray-800">{job.hiringPlan.sqlTopics}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm text-gray-500">DSA Questions</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.dsaQuestions} onChange={(e) => setTemp((t) => ({ ...t, dsaQuestions: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">SQL Questions</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.sqlQuestions} onChange={(e) => setTemp((t) => ({ ...t, sqlQuestions: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Time (mins)</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.dsaSqlTime} onChange={(e) => setTemp((t) => ({ ...t, dsaSqlTime: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm text-gray-500">DSA Topics</label>
                            <input className="w-full mt-1 p-2 border rounded" value={temp.dsaTopics} onChange={(e) => setTemp((t) => ({ ...t, dsaTopics: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">SQL Topics</label>
                            <input className="w-full mt-1 p-2 border rounded" value={temp.sqlTopics} onChange={(e) => setTemp((t) => ({ ...t, sqlTopics: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {job.hiringPlan.aiEnabled && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <CheckCircle2 size={18} className="text-purple-600" />
                        AI Interview Round
                      </div>
                      {!editing.ai ? (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit('ai')} className="px-3 py-1 text-sm bg-gray-100 rounded">Edit</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveAi} className="px-3 py-1 text-sm bg-primary text-white rounded">Save</button>
                          <button onClick={() => cancelEdit('ai')} className="px-3 py-1 text-sm bg-gray-100 rounded">Cancel</button>
                        </div>
                      )}
                    </div>

                    {!editing.ai ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Duration</p>
                            <div className="flex items-center gap-2">
                              <Clock3 size={20} className="text-orange-600" />
                              <p className="text-2xl font-bold text-orange-700">{job.hiringPlan.aiTime} min</p>
                            </div>
                          </div>
                          {job.hiringPlan.aiTopics && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Topics</p>
                              <p className="text-gray-800">{job.hiringPlan.aiTopics}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm text-gray-500">Time (mins)</label>
                            <input type="number" className="w-full mt-1 p-2 border rounded" value={temp.aiTime} onChange={(e) => setTemp((t) => ({ ...t, aiTime: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Topics</label>
                            <input className="w-full mt-1 p-2 border rounded" value={temp.aiTopics} onChange={(e) => setTemp((t) => ({ ...t, aiTopics: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-gray-600 text-sm">Total Applicants</p>
            <p className="text-3xl font-bold text-primary">{candidatesList.length}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Evaluated</p>
            <p className="text-3xl font-bold text-purple-600">{evaluatedCount}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Selected</p>
            <p className="text-3xl font-bold text-green-600">{selectedCount}</p>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Applicants</h2>
        </div>

        {candidatesList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Resume
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Aptitude
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    DSA
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Interview
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Overall
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {candidatesList.map((candidate) => (
                  <CandidateRow key={candidate.id} candidate={candidate} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600 text-lg">No applicants yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
