export const mockJobs = [
  {
    id: 'job1',
    title: 'Senior React Developer',
    description: 'We are looking for an experienced React developer to join our team.',
    department: 'Engineering',
    salary: '$120k - $150k',
    requiredExperienceYears: 3,
    applicants: 24,
    postedDate: '2024-05-01',
    createdAt: '2024-05-01T00:00:00.000Z',
    status: 'active'
  },
  {
    id: 'job2',
    title: 'Product Manager',
    description: 'Join our product team to shape the future of our platform.',
    department: 'Product',
    salary: '$100k - $130k',
    requiredExperienceYears: 5,
    applicants: 18,
    postedDate: '2024-04-28',
    createdAt: '2024-04-28T00:00:00.000Z',
    status: 'active'
  },
  {
    id: 'job3',
    title: 'DevOps Engineer',
    description: 'Manage and optimize our cloud infrastructure.',
    department: 'Infrastructure',
    requiredExperienceYears: 4,
    salary: '$110k - $140k',
    applicants: 12,
    postedDate: '2024-04-20',
    createdAt: '2024-04-20T00:00:00.000Z',
    status: 'active'
  },
  {
    id: 'job4',
    title: 'Data Scientist',
    description: 'Build ML models to drive business insights.',
    department: 'Data',
    requiredExperienceYears: 4,
    salary: '$130k - $160k',
    applicants: 15,
    postedDate: '2024-04-15',
    createdAt: '2024-04-15T00:00:00.000Z',
    status: 'closed'
  }
]

export const mockCandidates = {
  job1: [
    {
      id: 'cand1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-234-567-8900',
      appliedDate: '2024-05-02',
      scores: {
        resumeScreening: 85,
        aptitudeTest: 78,
        dsaRound: 88,
        aiInterview: 82,
        overallScore: 83
      },
      status: 'evaluated'
    },
    {
      id: 'cand2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-234-567-8901',
      appliedDate: '2024-05-01',
      scores: {
        resumeScreening: 92,
        aptitudeTest: 95,
        dsaRound: 89,
        aiInterview: 91,
        overallScore: 92
      },
      status: 'evaluated'
    },
    {
      id: 'cand3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+1-234-567-8902',
      appliedDate: '2024-04-30',
      scores: {
        resumeScreening: 65,
        aptitudeTest: 0,
        dsaRound: 0,
        aiInterview: 0,
        overallScore: 65
      },
      status: 'screening'
    },
    {
      id: 'cand4',
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      phone: '+1-234-567-8903',
      appliedDate: '2024-04-28',
      scores: {
        resumeScreening: 45,
        aptitudeTest: 0,
        dsaRound: 0,
        aiInterview: 0,
        overallScore: 45
      },
      status: 'applied'
    }
  ],
  job2: [
    {
      id: 'cand5',
      name: 'Alex Chen',
      email: 'alex@example.com',
      phone: '+1-234-567-8904',
      appliedDate: '2024-05-02',
      scores: {
        resumeScreening: 88,
        aptitudeTest: 85,
        dsaRound: 0,
        aiInterview: 0,
        overallScore: 87
      },
      status: 'screening'
    }
  ],
  job3: [
    {
      id: 'cand6',
      name: 'Bob Martinez',
      email: 'bob@example.com',
      phone: '+1-234-567-8905',
      appliedDate: '2024-05-02',
      scores: {
        resumeScreening: 80,
        aptitudeTest: 82,
        dsaRound: 85,
        aiInterview: 81,
        overallScore: 82
      },
      status: 'evaluated'
    }
  ]
}

export const mockEvaluationDetails = {
  cand1: {
    candidateId: 'cand1',
    jobId: 'job1',
    candidate: {
      id: 'cand1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-234-567-8900',
      appliedDate: '2024-05-02',
      scores: {
        resumeScreening: 85,
        aptitudeTest: 78,
        dsaRound: 88,
        aiInterview: 82,
        overallScore: 83
      },
      status: 'evaluated'
    },
    evaluationStages: [
      {
        name: 'Resume Screening',
        score: 85,
        maxScore: 100,
        feedback: 'Strong background in React and relevant experience.',
        status: 'completed',
        details: [
          '8+ years of software development experience',
          'Proven expertise in React and TypeScript',
          'Led 3 successful product launches'
        ]
      },
      {
        name: 'Aptitude Test',
        score: 78,
        maxScore: 100,
        feedback: 'Good problem-solving skills, average on logic questions.',
        status: 'completed',
        details: [
          'Verbal Reasoning: 82/100',
          'Logical Reasoning: 75/100',
          'Quantitative Aptitude: 77/100'
        ]
      },
      {
        name: 'DSA Round',
        score: 88,
        maxScore: 100,
        feedback: 'Excellent data structure knowledge and algorithmic thinking.',
        status: 'completed',
        details: [
          'Question 1: Optimal solution (30/30)',
          'Question 2: Optimal solution (29/30)',
          'Question 3: Good approach (29/30)'
        ]
      },
      {
        name: 'AI Interview',
        score: 82,
        maxScore: 100,
        feedback: 'Strong communication, good project explanation, confident in answers.',
        status: 'completed',
        details: [
          'Technical Communication: 85/100',
          'Problem Solving: 80/100',
          'Experience Depth: 82/100',
          'Team Collaboration: 80/100'
        ]
      }
    ],
    finalRanking: 1,
    recommendation: 'strong_accept'
  },
  cand2: {
    candidateId: 'cand2',
    jobId: 'job1',
    candidate: {
      id: 'cand2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-234-567-8901',
      appliedDate: '2024-05-01',
      scores: {
        resumeScreening: 92,
        aptitudeTest: 95,
        dsaRound: 89,
        aiInterview: 91,
        overallScore: 92
      },
      status: 'evaluated'
    },
    evaluationStages: [
      {
        name: 'Resume Screening',
        score: 92,
        maxScore: 100,
        feedback: 'Exceptional resume with perfect match for the role.',
        status: 'completed',
        details: [
          '10+ years of React development',
          'Lead Architect at Fortune 500 company',
          'Published open-source libraries'
        ]
      },
      {
        name: 'Aptitude Test',
        score: 95,
        maxScore: 100,
        feedback: 'Outstanding performance across all sections.',
        status: 'completed',
        details: [
          'Verbal Reasoning: 95/100',
          'Logical Reasoning: 96/100',
          'Quantitative Aptitude: 94/100'
        ]
      },
      {
        name: 'DSA Round',
        score: 89,
        maxScore: 100,
        feedback: 'Strong algorithmic approach with minor optimization opportunities.',
        status: 'completed',
        details: [
          'Question 1: Optimal solution (30/30)',
          'Question 2: Optimal solution (30/30)',
          'Question 3: Good approach (29/30)'
        ]
      },
      {
        name: 'AI Interview',
        score: 91,
        maxScore: 100,
        feedback: 'Exceptional communication and impressive project portfolio.',
        status: 'completed',
        details: [
          'Technical Communication: 92/100',
          'Problem Solving: 91/100',
          'Experience Depth: 91/100',
          'Team Collaboration: 90/100'
        ]
      }
    ],
    finalRanking: 1,
    recommendation: 'strong_accept'
  }
}
