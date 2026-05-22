import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function ScoreCard({
  title,
  score,
  maxScore = 100,
  status,
  onClick
}) {
  const percentage = (score / maxScore) * 100
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className={getStatusColor()} />
      case 'pending':
        return <Clock size={20} className={getStatusColor()} />
      case 'failed':
        return <AlertCircle size={20} className={getStatusColor()} />
    }
  }

  const getBackgroundColor = () => {
    if (percentage >= 80) return 'bg-green-100'
    if (percentage >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${getBackgroundColor()}`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {getStatusIcon()}
      </div>

      <div className="flex items-baseline space-x-2 mb-3">
        <span className="text-2xl font-bold text-gray-800">{score}</span>
        <span className="text-gray-600">/{maxScore}</span>
      </div>

      <div className="w-full bg-gray-300 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage >= 80
              ? 'bg-green-600'
              : percentage >= 60
              ? 'bg-yellow-600'
              : 'bg-red-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-sm text-gray-600 mt-2">{Math.round(percentage)}%</p>
    </div>
  )
}
