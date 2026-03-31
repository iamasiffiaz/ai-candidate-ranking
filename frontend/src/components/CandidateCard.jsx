import { Link } from 'react-router-dom'
import { ChevronRight, Mail, Phone, Trophy, User } from 'lucide-react'
import clsx from 'clsx'
import ScoreBadge from './ScoreBadge'

const RANK_MEDALS = {
  1: { bg: 'bg-yellow-400', label: '🥇' },
  2: { bg: 'bg-gray-300', label: '🥈' },
  3: { bg: 'bg-amber-600', label: '🥉' },
}

export default function CandidateCard({ resume, rank, jobId }) {
  const medal = RANK_MEDALS[rank]

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        {/* Rank badge + info */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow',
              medal ? medal.bg : 'bg-blue-600'
            )}
          >
            {medal ? <span className="text-base">{medal.label}</span> : rank}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {resume.candidate_name || 'Unknown Candidate'}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {resume.candidate_email && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Mail className="w-3 h-3" />
                  {resume.candidate_email}
                </span>
              )}
              {resume.candidate_phone && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="w-3 h-3" />
                  {resume.candidate_phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score + link */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreBadge score={resume.similarity_score} />
          <Link
            to={`/jobs/${jobId}/candidates/${resume.id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View full analysis"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* AI summary preview */}
      {resume.ai_summary && (
        <p className="mt-3 pt-3 text-sm text-gray-600 border-t border-gray-100 line-clamp-2">
          {resume.ai_summary}
        </p>
      )}
    </div>
  )
}
