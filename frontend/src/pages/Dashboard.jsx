import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Users, Briefcase, CheckCircle, Sparkles, ClipboardList, Target, Layers, Clock3, X } from 'lucide-react'
import JobCard from '../components/JobCard.jsx'
import { useJobs } from '../context/JobContext.jsx'

export default function Dashboard() {
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const navigate = useNavigate()
  const { jobs, addJob } = useJobs()
  const [jobForm, setJobForm] = useState({
    title: '',
    department: '',
    salary: '',
    requiredExperienceYears: '',
    skills: '',
    description: '',
    aptitudeEnabled: true,
    aptitudeQuestions: 10,
    aptitudeQuestionType: 'mcq',
    aptitudeTopics: '',
    aptitudeTime: 30,
    dsaSqlEnabled: true,
    dsaQuestions: 5,
    sqlQuestions: 5,
    dsaTopics: '',
    sqlTopics: '',
    dsaDifficulty: 'medium',
    sqlDifficulty: 'medium',
    dsaSqlTime: 45,
    aiEnabled: true,
    aiTime: 20,
    aiTopics: ''
  })

  const totalApplicants = 0
  const evaluatedCandidates = 0

  const updateField = (field, value) => {
    setJobForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const updateRoundField = (round, field, value) => {
    setJobForm((current) => ({
      ...current,
      [round]: {
        ...(current[round] || {}),
        [field]: value
      }
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const newJob = {
      id: `job-${Date.now()}`,
      title: jobForm.title,
      description: jobForm.description,
      requiredExperienceYears: jobForm.requiredExperienceYears ? Number(jobForm.requiredExperienceYears) : null,
      department: jobForm.department,
      salary: jobForm.salary,
      applicants: 0,
      postedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      status: 'active',
      hiringPlan: {
        skills: jobForm.skills,
        requiredExperienceYears: jobForm.requiredExperienceYears ? Number(jobForm.requiredExperienceYears) : null,
        aptitudeEnabled: jobForm.aptitudeEnabled,
        aptitudeQuestions: jobForm.aptitudeQuestions,
        aptitudeQuestionType: jobForm.aptitudeQuestionType,
        aptitudeTopics: jobForm.aptitudeTopics,
        aptitudeTime: jobForm.aptitudeTime,
        dsaSqlEnabled: jobForm.dsaSqlEnabled,
        dsaQuestions: jobForm.dsaQuestions,
        sqlQuestions: jobForm.sqlQuestions,
        dsaTopics: jobForm.dsaTopics,
        sqlTopics: jobForm.sqlTopics,
        dsaDifficulty: jobForm.dsaDifficulty,
        sqlDifficulty: jobForm.sqlDifficulty,
        dsaSqlTime: jobForm.dsaSqlTime,
        aiEnabled: jobForm.aiEnabled,
        aiTime: jobForm.aiTime,
        aiTopics: jobForm.aiTopics
      }
    }

    addJob(newJob)
    setShowNewJobModal(false)
    setJobForm({
      requiredExperienceYears: '',
      title: '',
      department: '',
      salary: '',
      skills: '',
      description: '',
      aptitudeEnabled: true,
      aptitudeQuestions: 10,
      aptitudeQuestionType: 'mcq',
      aptitudeTopics: '',
      aptitudeTime: 30,
      dsaSqlEnabled: true,
      dsaDifficulty: 'medium',
      sqlDifficulty: 'medium',
      dsaQuestions: 5,
      sqlQuestions: 5,
      dsaTopics: '',
      sqlTopics: '',
      dsaSqlTime: 45,
      aiEnabled: true,
      aiTime: 20,
      aiTopics: ''
    })
  }

  const stats = [
    { label: 'Active Jobs', value: jobs.filter((j) => j.status === 'active').length, icon: Briefcase, color: 'bg-blue-100' },
    { label: 'Total Applicants', value: totalApplicants, icon: Users, color: 'bg-green-100' },
    { label: 'Evaluated', value: evaluatedCandidates, icon: CheckCircle, color: 'bg-purple-100' },
    { label: 'Selected', value: 2, icon: TrendingUp, color: 'bg-yellow-100' }
  ]

  const enabledRounds = [
    {
      label: 'Aptitude',
      enabled: jobForm.aptitudeEnabled,
      details: `${jobForm.aptitudeQuestions} questions · ${jobForm.aptitudeTime} min`
    },
    {
      label: 'DSA + SQL',
      enabled: jobForm.dsaSqlEnabled,
      details: `${jobForm.dsaQuestions + jobForm.sqlQuestions} questions · ${jobForm.dsaSqlTime} min`
    },
    {
      label: 'AI Interview',
      enabled: jobForm.aiEnabled,
      details: `${jobForm.aiTime} min interview`
    }
  ]

  const enabledRoundCount = enabledRounds.filter((round) => round.enabled).length
  const estimatedTime = enabledRounds.reduce((total, round) => {
    if (!round.enabled) return total
    const value = Number.parseInt(round.details.match(/(\d+) min/)?.[1] || '0', 10)
    return total + value
  }, 0)

  return (
    <div className="p-8 space-y-8 bg-gradient-to-b from-slate-50 to-white min-h-full">
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 text-white p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-blue-100 text-sm font-semibold uppercase tracking-[0.24em]">Recruiter Workspace</p>
            <h1 className="text-4xl font-black mt-2">Hiring command center</h1>
            <p className="text-blue-50 mt-3 max-w-2xl">
              Build jobs, configure assessment rounds, and review candidate evaluation pipelines from one place.
            </p>
          </div>
          <button
            onClick={() => navigate('/jobs/new')}
            className="btn-cta"
          >
            <Plus size={20} />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Metrics</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-2xl`}>
                  <Icon size={24} className="text-gray-700" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Job Postings */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Job Postings</h2>
          <p className="text-sm text-gray-500">Recruiter-managed roles and assessment flows</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.slice(0, 4).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="mx-auto my-4 flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
              <div className="relative overflow-hidden bg-primary-700 px-8 py-7 text-white">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white blur-3xl" />
                  <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-cyan-200 blur-3xl" />
                </div>
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90">
                      <Sparkles size={14} />
                      Recruiter Job Composer
                    </div>
                    <div>
                      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Post a job and define the hiring flow</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                        Build the role once, then configure the screening rounds, topic focus, and pacing recruiters should use.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewJobModal(false)}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
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
                    <p className="text-xs uppercase tracking-[0.22em] text-white/70">Estimated Time</p>
                    <p className="mt-2 text-2xl font-black">{estimatedTime || 0} min</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/70">Posting Scope</p>
                    <p className="mt-2 text-2xl font-black">Full pipeline</p>
                  </div>
                </div>
              </div>

              <form className="grid gap-0 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]" onSubmit={handleSubmit}>
                <div className="space-y-6 bg-slate-50 p-6 sm:p-8 lg:p-10">
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="rounded-xl bg-primary-100 p-2 text-primary-700">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Role details</h3>
                        <p className="mt-1 text-sm text-slate-500">Capture the essentials for this opening.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Job Title</label>
                        <input
                          type="text"
                          value={jobForm.title}
                          onChange={(event) => updateField('title', event.target.value)}
                          placeholder="Job title"
                          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-neutral-800 placeholder:text-neutral-400 shadow-sm outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Department</label>
                        <input
                          type="text"
                          value={jobForm.department}
                          onChange={(event) => updateField('department', event.target.value)}
                          placeholder="Department"
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
                          placeholder="Salary range"
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
                          placeholder="Years"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs uppercase tracking-[0.22em] text-slate-600 font-semibold">Required Skills</label>
                        <input
                          type="text"
                          value={jobForm.skills}
                          onChange={(event) => updateField('skills', event.target.value)}
                          placeholder="Skills needed, comma separated"
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
                          placeholder="Write a clear job description"
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
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                        <Target size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Assessment rounds</h3>
                        <p className="mt-1 text-sm text-slate-500">Switch rounds on or off and tune the questions and timing.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-slate-900">Aptitude round</h4>
                            <p className="mt-1 text-sm text-slate-500">Use this for logical reasoning and screening.</p>
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
                                placeholder="Questions"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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
                            <div className="md:col-span-2">
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
                            <h4 className="font-semibold text-slate-900">DSA + SQL round</h4>
                            <p className="mt-1 text-sm text-slate-500">Separate algorithm and database screening.</p>
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
                                placeholder="DSA questions"
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
                                placeholder="SQL questions"
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
                            <h4 className="font-semibold text-slate-900">AI interview round</h4>
                            <p className="mt-1 text-sm text-slate-500">Capture the final conversation scope and timing.</p>
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
                                placeholder="Interview topics"
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
                    <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                        <Layers size={14} />
                        Hiring plan preview
                      </div>
                      <h3 className="mt-3 text-xl font-bold">{jobForm.title || 'Job title preview'}</h3>
                      <p className="mt-2 text-sm text-white/75">
                        {jobForm.department || 'Department'} {jobForm.salary ? `• ${jobForm.salary}` : ''}
                      </p>
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                          <Clock3 size={14} />
                          Estimated interview time
                        </div>
                        <p className="mt-2 text-3xl font-black">{estimatedTime || 0} min</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Round checklist</h4>
                      <div className="mt-4 space-y-3">
                        {enabledRounds.map((round) => (
                          <div
                            key={round.label}
                            className={`rounded-2xl border px-4 py-3 ${round.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">{round.label}</p>
                                <p className="mt-1 text-sm text-slate-500">{round.details}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${round.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {round.enabled ? 'On' : 'Off'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-950">
                      <p className="font-semibold">Tip</p>
                      <p className="mt-2 leading-6 text-indigo-900/80">
                        Keep the round topics short and specific. That makes the candidate flow easier to follow and keeps hiring consistent.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowNewJobModal(false)}
                        className="flex-1 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-cyan-700"
                      >
                        Post Job
                      </button>
                    </div>
                  </div>
                </aside>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
