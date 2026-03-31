import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Brain,
  Mail,
  Phone,
  RefreshCw,
  Target,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react'
import { rankingService } from '../services/rankingService'
import { jobService } from '../services/jobService'
import ScoreBadge from '../components/ScoreBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function CandidateDetail() {
  const { jobId, resumeId } = useParams()
  const [forceRegenerate, setForceRegenerate] = useState(false)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getJob(jobId),
  })

  const {
    data: analysis,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['candidate-analysis', jobId, resumeId, forceRegenerate],
    queryFn: () =>
      rankingService.getCandidateAnalysis(jobId, resumeId, {
        force: forceRegenerate,
      }),
  })

  const handleRegenerate = () => {
    setForceRegenerate(true)
    refetch().then(() => {
      toast.success('AI analysis regenerated!')
      setForceRegenerate(false)
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Generating AI analysis…</p>
      </div>
    )
  }

  if (!analysis) return null

  const strengthsList =
    analysis.ai_strengths
      ?.split('|')
      .map((s) => s.trim())
      .filter(Boolean) ?? []

  const weaknessesList =
    analysis.ai_weaknesses
      ?.split('|')
      .map((s) => s.trim())
      .filter(Boolean) ?? []

  const scorePct = analysis.similarity_score
    ? Math.round(analysis.similarity_score * 100)
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/jobs/${jobId}/rankings`}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Candidate Profile</h1>
            {job && (
              <p className="text-sm text-gray-500 mt-0.5">
                Position: <span className="font-medium text-gray-700">{job.title}</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          className="btn-secondary flex items-center gap-2 text-sm"
          title="Regenerate AI analysis"
        >
          <RefreshCw className="w-4 h-4" /> Re-analyse
        </button>
      </div>

      {/* Candidate header card */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {analysis.candidate_name || 'Unknown Candidate'}
              </h2>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {analysis.candidate_email && (
                  <a
                    href={`mailto:${analysis.candidate_email}`}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {analysis.candidate_email}
                  </a>
                )}
                {analysis.candidate_phone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {analysis.candidate_phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Match Score
            </p>
            <ScoreBadge score={analysis.similarity_score} showBar />
            {scorePct !== null && (
              <p className="text-xs text-gray-400 mt-1">
                {scorePct >= 70
                  ? 'Excellent match'
                  : scorePct >= 45
                  ? 'Moderate match'
                  : 'Low match'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {analysis.ai_summary && (
        <div className="card">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Summary
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm">{analysis.ai_summary}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strengthsList.length > 0 && (
          <div className="card border-l-4 border-emerald-400">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <ThumbsUp className="w-4.5 h-4.5 text-emerald-500" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {strengthsList.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {weaknessesList.length > 0 && (
          <div className="card border-l-4 border-red-400">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <ThumbsDown className="w-4.5 h-4.5 text-red-500" />
              Areas for Development
            </h3>
            <ul className="space-y-2">
              {weaknessesList.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Match explanation */}
      {analysis.ai_match_explanation && (
        <div className="card bg-blue-50 border border-blue-200">
          <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            Why this score?
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            {analysis.ai_match_explanation}
          </p>
        </div>
      )}

      {/* Empty state if no AI data yet */}
      {!analysis.ai_summary && !analysis.similarity_score && (
        <div className="card text-center py-8">
          <Brain className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No AI analysis available yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Run the ranking pipeline first, or click &quot;Re-analyse&quot; above.
          </p>
        </div>
      )}
    </div>
  )
}
