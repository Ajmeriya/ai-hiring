import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const getStatusBadge = (status) => {
  const statusConfig = {
    applied: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Applied' },
    screening: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Screening' },
    evaluated: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Evaluated' },
    selected: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selected' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
  }

  const config = statusConfig[status] || statusConfig.applied
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

const getScoreColor = (score) => {
  if (score === 0) return 'text-gray-400'
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export default function CandidateRow({ candidate }) {
  return (
    <Link to={`/candidates/${candidate.id}`}>
      <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
        <td className="px-6 py-4">
          <div>
            <p className="font-semibold text-gray-800">{candidate.name}</p>
            <p className="text-sm text-gray-600">{candidate.email}</p>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">{candidate.appliedDate}</td>
        <td className="px-6 py-4">{getStatusBadge(candidate.status)}</td>
        <td className="px-6 py-4 text-center">
          <span className={`font-bold text-lg ${getScoreColor(candidate.scores.resumeScreening)}`}>
            {candidate.scores.resumeScreening > 0 ? candidate.scores.resumeScreening : '-'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`font-bold text-lg ${getScoreColor(candidate.scores.aptitudeTest)}`}>
            {candidate.scores.aptitudeTest > 0 ? candidate.scores.aptitudeTest : '-'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`font-bold text-lg ${getScoreColor(candidate.scores.dsaRound)}`}>
            {candidate.scores.dsaRound > 0 ? candidate.scores.dsaRound : '-'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`font-bold text-lg ${getScoreColor(candidate.scores.aiInterview)}`}>
            {candidate.scores.aiInterview > 0 ? candidate.scores.aiInterview : '-'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="font-bold text-lg text-primary">
            {candidate.scores.overallScore}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <ChevronRight size={20} className="text-gray-400" />
        </td>
      </tr>
    </Link>
  )
}
