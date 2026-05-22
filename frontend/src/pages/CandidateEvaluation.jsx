import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CandidateEvaluation() {
  const navigate = useNavigate()

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-primary hover:text-blue-600 mb-6 font-semibold"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-lg p-8 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Evaluation data not available</h1>
        <p className="text-gray-600">
          This page now depends on backend evaluation records only. Create applications and process them through the API to view candidate evaluations here.
        </p>
      </div>
    </div>
  )
}
