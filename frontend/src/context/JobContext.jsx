import { createContext, useContext, useEffect, useState } from 'react'
import { authenticatedFetch } from '../api/authApi.js'
import { JOB_SERVICE_URL } from '../config/serviceUrls.js'

const JobContext = createContext(null)
const fallbackJobsContext = {
  jobs: [],
  addJob: () => {},
  updateJob: () => {}
}

function getInitialJobs() {
  return []
}

export function JobProvider({ children }) {
  const [jobs, setJobs] = useState(getInitialJobs)

  // Fetch jobs from backend on mount
  useEffect(() => {
    let mounted = true

    async function loadJobs() {
      try {
        const res = await authenticatedFetch(JOB_SERVICE_URL)
        if (!res.ok) {
          console.error('Failed to load jobs from backend')
          return
        }
        const data = await res.json()
        if (!mounted) return
        // backend returns JobSummaryResponse list; normalize and map to frontend shape
        if (data && Array.isArray(data) && data.length > 0) {
          const normalized = data.map((j) => mapServerJobToFrontend(j))
          setJobs(normalized)
        } else {
          setJobs([])
        }
      } catch (e) {
        console.error('Could not load jobs from backend:', e.message)
        setJobs([])
      }
    }

    loadJobs()
    return () => { mounted = false }
  }, [])

  const addJob = (job) => {
    const mapped = job && job.id ? mapServerJobToFrontend(job) : job
    const jobWithCreated = {
      ...mapped,
      createdAt: mapped?.createdAt || new Date().toISOString()
    }

    setJobs((currentJobs) => [jobWithCreated, ...currentJobs])
  }

  // Convert server JobResponse or JobSummaryResponse into frontend job with `hiringPlan`
  function mapServerJobToFrontend(serverJob) {
    if (!serverJob) return serverJob

    const hiringPlan = {
      skills: serverJob.skills ? (Array.isArray(serverJob.skills) ? serverJob.skills.join(', ') : serverJob.skills) : undefined,
      requiredExperienceYears: serverJob.requiredExperienceYears ?? null,
      aptitudeEnabled: serverJob.jobRounds?.aptitudeEnabled ?? serverJob.aptitudeEnabled ?? false,
      aptitudeQuestions: serverJob.aptitudeConfig?.numQuestions ?? null,
      aptitudeQuestionType: serverJob.aptitudeConfig?.type ?? 'mcq',
      aptitudeTopics: serverJob.aptitudeConfig?.topics ?? '',
      aptitudeTime: serverJob.aptitudeConfig?.time ?? null,
      dsaSqlEnabled: serverJob.jobRounds?.technicalEnabled ?? serverJob.technicalEnabled ?? false,
      dsaQuestions: serverJob.technicalConfig?.dsaQuestions ?? null,
      sqlQuestions: serverJob.technicalConfig?.sqlQuestions ?? null,
      dsaTopics: serverJob.technicalConfig?.dsaTopics ?? '',
      sqlTopics: serverJob.technicalConfig?.sqlTopics ?? '',
      dsaDifficulty: serverJob.technicalConfig?.dsaDifficulty ?? 'medium',
      sqlDifficulty: serverJob.technicalConfig?.sqlDifficulty ?? 'medium',
      dsaSqlTime: serverJob.technicalConfig?.time ?? null,
      aiEnabled: serverJob.jobRounds?.interviewEnabled ?? serverJob.interviewEnabled ?? false,
      aiTime: serverJob.interviewConfig?.duration ?? null,
      aiTopics: serverJob.interviewConfig?.topics ?? ''
    }

    return {
      id: serverJob.id,
      title: serverJob.title,
      department: serverJob.department,
      salary: serverJob.salary,
      description: serverJob.description,
      requiredExperienceYears: serverJob.requiredExperienceYears ?? null,
      status: serverJob.status ?? 'active',
      applicants: serverJob.applicants ?? 0,
      createdAt: serverJob.createdAt ?? serverJob.postedDate ?? null,
      hiringPlan
    }
  }

  const updateJob = (id, patch) => {
    setJobs((currentJobs) =>
      currentJobs.map((j) => (String(j.id) === String(id) ? { ...j, ...patch } : j))
    )
  }

  const value = {
    jobs,
    addJob,
    updateJob
  }

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>
}

export function useJobs() {
  const context = useContext(JobContext)

  return context || fallbackJobsContext
}
