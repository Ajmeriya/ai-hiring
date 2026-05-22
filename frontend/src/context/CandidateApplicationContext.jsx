import { createContext, useContext, useEffect, useState } from 'react'
import { authenticatedFetch } from '../api/authApi.js'

const APPLICATIONS_STORAGE_KEY = 'ai-hiring-platform-candidate-applications'
const APPLICATION_SERVICE_URL = 'http://localhost:8083'

const CandidateApplicationContext = createContext(null)

const ROUND_STAGE_MAP = {
  RESUME: 'resume',
  RESUME_REVIEWING: 'resume',
  APTITUDE: 'aptitude',
  TECHNICAL: 'dsaSql',
  INTERVIEW: 'aiInterview',
  COMPLETED: null
}

export const getRoundSequence = (job) => {
  const sequence = ['resume']

  if (job?.hiringPlan?.aptitudeEnabled) {
    sequence.push('aptitude')
  }

  if (job?.hiringPlan?.dsaSqlEnabled) {
    sequence.push('dsaSql')
  }

  if (job?.hiringPlan?.aiEnabled) {
    sequence.push('aiInterview')
  }

  return sequence
}

export const getNextRound = (job, completedStages = []) => {
  return getRoundSequence(job).find((stage) => !completedStages.includes(stage)) || null
}

function getInitialApplications() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedApplications = window.localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    return storedApplications ? JSON.parse(storedApplications) : []
  } catch {
    return []
  }
}

function normalizeApplication(application) {
  // Build progress array from completed round statuses only.
  const progress = Array.isArray(application.progress) ? [...application.progress] : []
  if (!application.progress) {
    if (application.resumeStatus === 'SHORTLISTED' || application.resumeStatus === 'COMPLETED') {
      progress.push('resume')
    }
    if (application.aptitudeStatus === 'COMPLETED' || application.aptitudeStatus === 'PASSED') {
      progress.push('aptitude')
    }
    if (application.technicalStatus === 'COMPLETED' || application.technicalStatus === 'PASSED') {
      progress.push('dsaSql')
    }
    if (application.interviewStatus === 'COMPLETED' || application.interviewStatus === 'PASSED') {
      progress.push('aiInterview')
    }
  }

  let currentStage = application.currentStage || ROUND_STAGE_MAP[application.currentRound] || null
  const resumePending = !application.resumeStatus || application.resumeStatus === 'PENDING'

  // A newly created application must always start on resume, even if older cached
  // local state had a stale next stage recorded for the same job.
  if (resumePending && (application.currentRound == null || application.currentRound === 'RESUME' || application.currentRound === 'RESUME_REVIEWING')) {
    currentStage = 'resume'
  }

  return {
    id: application.id,
    jobId: application.jobId,
    jobTitle: application.jobTitle,
    department: application.department,
    company: application.company || 'AI Hiring Platform',
    candidateName: application.candidateName,
    candidateEmail: application.candidateEmail,
    resumeFileName: application.resumeFileName || application.resumePath || '',
    resumeSummary: application.resumeSummary,
    progress,
    currentStage,
    status: application.status || 'in-progress',
    appliedAt: application.appliedAt,
    updatedAt: application.updatedAt || application.appliedAt,
    roundScores: application.roundScores || {},
    resumeScore: application.resumeScore,
    resumeStatus: application.resumeStatus,
    overallStatus: application.overallStatus,
    aiEvaluationDetails: application.aiEvaluationDetails || application.ai_evaluation_details || '',
    currentRound: application.currentRound,
    aptitudeStatus: application.aptitudeStatus,
    technicalStatus: application.technicalStatus,
    interviewStatus: application.interviewStatus
  }
}

export function CandidateApplicationProvider({ children }) {
  const [applications, setApplications] = useState(getInitialApplications)

  // Fetch applications from backend on mount
  useEffect(() => {
    let mounted = true

    async function loadApplications() {
      try {
        // Get candidateId from user profile
        const userProfileStr = localStorage.getItem('ai-hiring-platform-user-profile')
        const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null
        const candidateId = userProfile?.email || userProfile?.id

        if (!candidateId) return

        const res = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/api/applications/candidate/${encodeURIComponent(candidateId)}`)
        if (!res.ok) return

        const data = await res.json()
        if (!mounted) return

        const normalized = data.map(app => normalizeApplication(app))
        setApplications(normalized)
      } catch (e) {
        console.debug('Could not load applications from backend:', e.message)
      }
    }

    loadApplications()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications))
    } catch {
      // Ignore persistence errors so the app stays usable in the browser.
    }
  }, [applications])

  const getApplicationByJobId = (jobId) => {
    return applications.find((application) => String(application.jobId) === String(jobId)) || null
  }

  const getApplicationById = (applicationId) => {
    return applications.find((application) => String(application.id) === String(applicationId)) || null
  }

  const applyForJob = async (job, candidateProfile, resumeData) => {
    try {
      if (!resumeData?.file) {
        throw new Error('Please upload your resume before applying.')
      }

      // Call backend API to create application
      const createAppRes = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          candidateId: candidateProfile?.id || candidateProfile?.email,
          candidateEmail: candidateProfile?.email || '',
          resumePath: resumeData.fileName || 'resume.pdf'
        })
      })

      if (!createAppRes.ok) {
        const error = new Error(`Failed to create application: ${createAppRes.statusText}`)
        error.backendError = true
        error.status = createAppRes.status
        throw error
      }

      const backendApp = await createAppRes.json()

      const evaluationResponse = await authenticatedFetch(
        `${APPLICATION_SERVICE_URL}/api/applications/${backendApp.id}/evaluate-resume-ai`,
        {
          method: 'POST',
          body: (() => {
            const formData = new FormData()
            formData.append('resume_file', resumeData.file)
            return formData
          })()
        }
      )

      if (!evaluationResponse.ok) {
        let detail = `HTTP ${evaluationResponse.status}`
        try {
          const errorPayload = await evaluationResponse.json()
          detail = errorPayload?.message || errorPayload?.detail || detail
        } catch {
          // Ignore JSON parse errors and keep HTTP detail fallback.
        }
        const error = new Error(`Resume evaluation failed: ${detail}`)
        error.backendError = true
        error.status = evaluationResponse.status
        throw error
      }

      // after evaluation, refresh all candidate applications from backend
      await refreshCandidateApplications(candidateProfile)
      const evaluatedApp = await evaluationResponse.json()
      return normalizeApplication({
        ...evaluatedApp,
        resumeFileName: resumeData.fileName || evaluatedApp.resumePath,
        resumeSummary: resumeData.summary || evaluatedApp.resumeSummary
      })
    } catch (e) {
      console.error('Error applying for job:', e.message)

      if (e?.backendError) {
        throw e
      }

      if (!resumeData?.file) {
        throw e
      }

      // Fallback to local storage
      const completedStages = ['resume']
      const currentStage = getNextRound(job, completedStages)
      const now = new Date().toISOString()

      const application = normalizeApplication({
        id: `app-${job.id}-${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        department: job.department,
        company: job.company || 'AI Hiring Platform',
        candidateName: candidateProfile?.fullName || 'Candidate',
        candidateEmail: candidateProfile?.email || '',
        resumeFileName: resumeData?.fileName || 'resume.pdf',
        resumeSummary: resumeData?.summary || '',
        progress: completedStages,
        currentStage,
        status: currentStage ? 'in-progress' : 'completed',
        appliedAt: now,
        updatedAt: now,
        roundScores: {}
      })

      setApplications((currentApplications) => [
        application,
        ...currentApplications.filter((existingApplication) => String(existingApplication.jobId) !== String(job.id))
      ])

      return application
    }
  }

  // Refresh applications list from backend for the current candidate
  const refreshCandidateApplications = async (candidateProfile) => {
    try {
      const candidateId = candidateProfile?.email || candidateProfile?.id
      if (!candidateId) return

      const res = await authenticatedFetch(`${APPLICATION_SERVICE_URL}/api/applications/candidate/${encodeURIComponent(candidateId)}`)
      if (!res.ok) return
      const data = await res.json()
      const normalized = data.map(app => normalizeApplication(app))
      setApplications(normalized)
    } catch (e) {
      console.debug('Could not refresh applications:', e.message)
    }
  }

  const completeRound = async (jobId, job, stageKey, score = 100) => {
    try {
      const application = applications.find((app) => String(app.jobId) === String(jobId))
      if (!application) {
        throw new Error('Application not found')
      }

      // Map frontend stage keys to backend round enum
      const roundMap = {
        resume: 'RESUME',
        aptitude: 'APTITUDE',
        dsaSql: 'TECHNICAL',
        aiInterview: 'INTERVIEW'
      }

      const round = roundMap[stageKey]
      const now = new Date().toISOString()

      // Call backend API to submit score
      const submitRes = await authenticatedFetch(
        `${APPLICATION_SERVICE_URL}/api/applications/${application.id}/round/${round}/submit-score`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score })
        }
      )

      if (!submitRes.ok) {
        throw new Error(`Failed to submit score: ${submitRes.statusText}`)
      }

      // refresh candidate applications after successful score submission
      const userProfileStr = localStorage.getItem('ai-hiring-platform-user-profile')
      const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null
      await refreshCandidateApplications(userProfile)
    } catch (e) {
      console.error('Error completing round:', e.message)

      // Fallback to local update
      const now = new Date().toISOString()

      setApplications((currentApplications) =>
        currentApplications.map((application) => {
          if (String(application.jobId) !== String(jobId)) {
            return application
          }

          const progress = Array.from(new Set([...(application.progress || []), stageKey]))
          const nextStage = getNextRound(job, progress)

          return normalizeApplication({
            ...application,
            progress,
            currentStage: nextStage,
            status: nextStage ? 'in-progress' : 'completed',
            updatedAt: now,
            roundScores: {
              ...(application.roundScores || {}),
              [stageKey]: score
            }
          })
        })
      )
    }
  }

  const value = {
    applications,
    applyForJob,
    completeRound,
    getApplicationByJobId,
    getApplicationById,
    getRoundSequence,
    getNextRound
  }

  return (
    <CandidateApplicationContext.Provider value={value}>
      {children}
    </CandidateApplicationContext.Provider>
  )
}

export function useCandidateApplications() {
  const context = useContext(CandidateApplicationContext)

  if (!context) {
    throw new Error('useCandidateApplications must be used within a CandidateApplicationProvider')
  }

  return context
}
