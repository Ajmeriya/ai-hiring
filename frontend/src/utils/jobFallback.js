export function buildFallbackJobFromApplication(application) {
  if (!application) return null

  const completedStages = Array.isArray(application.progress) ? application.progress : []

  return {
    id: application.jobId,
    title: application.jobTitle || `Job ${application.jobId}`,
    department: application.department || 'Candidate Portal',
    company: application.company || 'AI Hiring Platform',
    description: application.jobDescription || '',
    salary: application.salary || '',
    status: application.jobStatus || 'active',
    applicants: application.applicants ?? 0,
    postedDate: application.postedDate || application.appliedAt || '',
    hiringPlan: {
      aptitudeEnabled: Boolean(
        application.aptitudeStatus || completedStages.includes('aptitude') || application.currentStage === 'aptitude'
      ),
      aptitudeQuestions: application.aptitudeQuestions ?? null,
      aptitudeTime: application.aptitudeTime ?? null,
      dsaSqlEnabled: Boolean(
        application.technicalStatus || completedStages.includes('dsaSql') || application.currentStage === 'dsaSql'
      ),
      dsaQuestions: application.dsaQuestions ?? null,
      sqlQuestions: application.sqlQuestions ?? null,
      dsaSqlTime: application.dsaSqlTime ?? null,
      aiEnabled: Boolean(
        application.interviewStatus || completedStages.includes('aiInterview') || application.currentStage === 'aiInterview'
      ),
      aiTime: application.aiTime ?? null,
      aiTopics: application.aiTopics || ''
    }
  }
}