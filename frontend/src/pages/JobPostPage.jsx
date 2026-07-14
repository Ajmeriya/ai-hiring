import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobs } from '../context/JobContext.jsx'
import { JOB_SERVICE_URL } from '../config/serviceUrls.js'
import { Sparkles, ClipboardList, Target, Layers, Clock3, X, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function JobPostPage() {
  const navigate = useNavigate()
  const { addJob } = useJobs()
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    department: '',
    salary: '',
    requiredExperienceYears: '',
    skills: '',
    description: '',
    aptitudeEnabled: false,
    aptitudeQuestions: 10,
    aptitudeQuestionType: 'mcq',
    aptitudeTopics: '',
    aptitudeTime: 30,
    dsaSqlEnabled: false,
    dsaQuestions: 5,
    sqlQuestions: 5,
    dsaTopics: '',
    sqlTopics: '',
    dsaDifficulty: 'medium',
    sqlDifficulty: 'medium',
    dsaSqlTime: 45,
    aiEnabled: false,
    aiTime: 20,
    aiTopics: ''
  })

  const updateField = (field, value) => {
    setJobForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const token = localStorage.getItem('ai-hiring-platform-auth-token')
      if (!token) {
        alert('Please login first')
        navigate('/login')
        return
      }

      const skillsArray = jobForm.skills.split(',').map(s => s.trim()).filter(s => s)

      const payload = {
        title: jobForm.title,
        company: jobForm.company,
        department: jobForm.department,
        requiredExperienceYears: jobForm.requiredExperienceYears ? Number(jobForm.requiredExperienceYears) : null,
        salary: jobForm.salary,
        description: jobForm.description,
        skills: skillsArray,
        jobRounds: {
          aptitudeEnabled: jobForm.aptitudeEnabled,
          technicalEnabled: jobForm.dsaSqlEnabled,
          interviewEnabled: jobForm.aiEnabled
        },
        aptitudeConfig: jobForm.aptitudeEnabled ? {
          numQuestions: jobForm.aptitudeQuestions,
          type: jobForm.aptitudeQuestionType,
          topics: jobForm.aptitudeTopics,
          time: jobForm.aptitudeTime
        } : null,
        technicalConfig: jobForm.dsaSqlEnabled ? {
          dsaQuestions: jobForm.dsaQuestions,
          dsaTopics: jobForm.dsaTopics,
          dsaDifficulty: jobForm.dsaDifficulty,
          sqlQuestions: jobForm.sqlQuestions,
          sqlTopics: jobForm.sqlTopics,
          sqlDifficulty: jobForm.sqlDifficulty,
          time: jobForm.dsaSqlTime
        } : null,
        interviewConfig: jobForm.aiEnabled ? {
          duration: jobForm.aiTime,
          topics: jobForm.aiTopics
        } : null
      }

      const response = await fetch(JOB_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `Status ${response.status}`
        try {
          const errBody = await response.json()
          if (errBody && errBody.message) {
            errorMessage = errBody.message
          } else if (errBody) {
            errorMessage = JSON.stringify(errBody)
          }
        } catch (_) {
          try {
            const txt = await response.text()
            if (txt) errorMessage = txt
          } catch (_e) {}
        }

        alert(`Error creating job: ${errorMessage}`)
        return
      }

      const createdJob = await response.json()
      console.log('Job created successfully:', createdJob)
      // update local UI state
      try { addJob(createdJob) } catch (e) { /* ignore if provider not available */ }
      alert('Job posted successfully!')
      navigate('/jobs')
    } catch (error) {
      console.error('Error posting job:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const enabledRounds = [
    {
      label: 'Aptitude',
      enabled: jobForm.aptitudeEnabled,
      detail: `${jobForm.aptitudeQuestions} questions • ${jobForm.aptitudeTime} min`
    },
    {
      label: 'DSA + SQL',
      enabled: jobForm.dsaSqlEnabled,
      detail: `${jobForm.dsaQuestions + jobForm.sqlQuestions} questions • ${jobForm.dsaSqlTime} min`
    },
    {
      label: 'AI Interview',
      enabled: jobForm.aiEnabled,
      detail: `${jobForm.aiTime} min interview`
    }
  ]

  const enabledRoundCount = enabledRounds.filter((round) => round.enabled).length
  const totalQuestions =
    (jobForm.aptitudeEnabled ? jobForm.aptitudeQuestions : 0) +
    (jobForm.dsaSqlEnabled ? jobForm.dsaQuestions + jobForm.sqlQuestions : 0)
  const totalTime =
    (jobForm.aptitudeEnabled ? jobForm.aptitudeTime : 0) +
    (jobForm.dsaSqlEnabled ? jobForm.dsaSqlTime : 0) +
    (jobForm.aiEnabled ? jobForm.aiTime : 0)

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/50 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-primary-700 px-6 py-7 text-white sm:px-8">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-cyan-200 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90">
                <Sparkles size={14} />
                Recruiter Job Composer
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Post a job and define the hiring flow</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">Create the job and set the rounds.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              <X size={16} />
              Close
            </button>
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Rounds Enabled</p>
              <p className="mt-2 text-2xl font-black">{enabledRoundCount}/3</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Total Questions</p>
              <p className="mt-2 text-2xl font-black">{totalQuestions}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Estimated Time</p>
              <p className="mt-2 text-2xl font-black">{totalTime} min</p>
            </div>
          </div>
        </div>

        <form className="grid gap-0 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]" onSubmit={handleSubmit}>
          <div className="space-y-6 bg-slate-50 p-6 sm:p-8 lg:p-10">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Role details</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Job Title</label>
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="Example: Senior React Developer"
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-neutral-800 placeholder:text-neutral-400 shadow-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Company Name</label>
                  <input
                    type="text"
                    value={jobForm.company}
                    onChange={(event) => updateField('company', event.target.value)}
                    placeholder="Example: Tech Company Inc."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Department</label>
                  <input
                    type="text"
                    value={jobForm.department}
                    onChange={(event) => updateField('department', event.target.value)}
                    placeholder="Example: Engineering, Product, Data"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Salary Range</label>
                  <input
                    type="text"
                    value={jobForm.salary}
                    onChange={(event) => updateField('salary', event.target.value)}
                    placeholder="Example: $80k - $120k"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Required Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={jobForm.requiredExperienceYears}
                    onChange={(event) => updateField('requiredExperienceYears', event.target.value)}
                    placeholder="Enter years"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Required Skills</label>
                  <input
                    type="text"
                    value={jobForm.skills}
                    onChange={(event) => updateField('skills', event.target.value)}
                    placeholder="Example: React, Node.js, SQL"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Comma-separated list of required skills</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Job Description</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Write 2-4 lines about the role, team, and key responsibilities"
                    className="mt-1.5 w-full h-32 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    minLength={20}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Minimum 20 characters ({jobForm.description.length}/20) - Describe the role, team, and responsibilities
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-xl bg-primary-100 p-2 text-primary-700">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assessment rounds</h2>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">Aptitude round</h3>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        checked={jobForm.aptitudeEnabled}
                        onChange={(event) => updateField('aptitudeEnabled', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      Enabled
                    </label>
                  </div>
                  {jobForm.aptitudeEnabled && (
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Question count</label>
                        <input
                          type="number"
                          min="1"
                          value={jobForm.aptitudeQuestions}
                          onChange={(event) => updateField('aptitudeQuestions', Number(event.target.value))}
                          placeholder="Number of questions"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Question type</label>
                        <select
                          value={jobForm.aptitudeQuestionType}
                          onChange={(event) => updateField('aptitudeQuestionType', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="mcq">MCQ</option>
                          <option value="coding">Coding</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Topics</label>
                        <input
                          type="text"
                          value={jobForm.aptitudeTopics}
                          onChange={(event) => updateField('aptitudeTopics', event.target.value)}
                          placeholder="Example: reasoning, quant, verbal"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duration (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          value={jobForm.aptitudeTime}
                          onChange={(event) => updateField('aptitudeTime', Number(event.target.value))}
                          placeholder="Time in minutes"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">DSA + SQL round</h3>
                      <p className="mt-1 text-sm text-slate-500">Use DSA for coding and SQL for database questions.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        checked={jobForm.dsaSqlEnabled}
                        onChange={(event) => updateField('dsaSqlEnabled', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      Enabled
                    </label>
                  </div>
                  {jobForm.dsaSqlEnabled && (
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DSA question count</label>
                        <input
                          type="number"
                          min="0"
                          value={jobForm.dsaQuestions}
                          onChange={(event) => updateField('dsaQuestions', Number(event.target.value))}
                          placeholder="Number of DSA questions"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SQL question count</label>
                        <input
                          type="number"
                          min="0"
                          value={jobForm.sqlQuestions}
                          onChange={(event) => updateField('sqlQuestions', Number(event.target.value))}
                          placeholder="Number of SQL questions"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DSA topics</label>
                        <input
                          type="text"
                          value={jobForm.dsaTopics}
                          onChange={(event) => updateField('dsaTopics', event.target.value)}
                          placeholder="Example: arrays, trees, recursion"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DSA difficulty</label>
                        <select
                          value={jobForm.dsaDifficulty}
                          onChange={(event) => updateField('dsaDifficulty', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SQL topics</label>
                        <input
                          type="text"
                          value={jobForm.sqlTopics}
                          onChange={(event) => updateField('sqlTopics', event.target.value)}
                          placeholder="Example: joins, group by, subqueries"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SQL difficulty</label>
                        <select
                          value={jobForm.sqlDifficulty}
                          onChange={(event) => updateField('sqlDifficulty', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Combined round time</label>
                        <input
                          type="number"
                          min="1"
                          value={jobForm.dsaSqlTime}
                          onChange={(event) => updateField('dsaSqlTime', Number(event.target.value))}
                          placeholder="Time in minutes"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">AI interview round</h3>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        checked={jobForm.aiEnabled}
                        onChange={(event) => updateField('aiEnabled', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      Enabled
                    </label>
                  </div>
                  {jobForm.aiEnabled && (
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Interview time</label>
                        <input
                          type="number"
                          min="1"
                          value={jobForm.aiTime}
                          onChange={(event) => updateField('aiTime', Number(event.target.value))}
                          placeholder="Time in minutes"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Interview topics</label>
                        <input
                          type="text"
                          value={jobForm.aiTopics}
                          onChange={(event) => updateField('aiTopics', event.target.value)}
                          placeholder="Example: project depth, communication, leadership"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="border-t border-slate-200 bg-white px-6 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-6 lg:py-10">
            <div className="sticky top-6 space-y-6">
              <div className="rounded-2xl bg-primary-800 p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Layers size={14} />
                  Hiring plan preview
                </div>
                <h2 className="mt-3 text-xl font-bold">{jobForm.title || 'Job title preview'}</h2>
                <p className="mt-2 text-sm text-white/75">
                  {jobForm.department || 'Department'} {jobForm.salary ? `• ${jobForm.salary}` : ''}
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                    <Clock3 size={14} />
                    Estimated interview time
                  </div>
                  <p className="mt-2 text-3xl font-black">{totalTime} min</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Round checklist</h3>
                <div className="mt-4 space-y-3">
                  {enabledRounds.map((round) => (
                    <div
                      key={round.label}
                      className={`rounded-2xl border px-4 py-3 ${round.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{round.label}</p>
                          <p className="mt-1 text-sm text-slate-500">{round.detail}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${round.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {round.enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cta flex-1"
                >
                  Post Job
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
                <CheckCircle2 size={16} />
                This will create the job immediately and send it to the job list.
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  )
}
