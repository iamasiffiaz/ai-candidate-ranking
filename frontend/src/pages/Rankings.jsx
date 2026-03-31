import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Filter, Trophy, Upload, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { rankingService } from '../services/rankingService'
import { jobService } from '../services/jobService'
import CandidateCard from '../components/CandidateCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Rankings() {
  const { id: jobId } = useParams()
  const qc = useQueryClient()
  const [topK, setTopK] = useState(20)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getJob(jobId),
  })

  // Fetch cached results
  const { data: cachedResults, isLoading: loadingResults } = useQuery({
    queryKey: ['rankings', jobId, topK],
    queryFn: () => rankingService.getRankingResults(jobId, { top_k: topK }),
  })

  // Run AI ranking pipeline
  const rankMutation = useMutation({
    mutationFn: () =>
      rankingService.rankCandidates(jobId, { top_k: topK, generate_ai: true }),
    onSuccess: (data) => {
      toast.success(`Ranked ${data.total_candidates} candidates!`)
      qc.setQueryData(['rankings', jobId, topK], data)
    },
    onError: (err) =>
      toast.error(err.response?.data?.detail || 'Ranking failed. Please try again.'),
  })

  const handleDownload = async () => {
    try {
      const response = await rankingService.downloadReport(jobId, topK)
      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `ranking_report_job_${jobId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Failed to download report')
    }
  }

  // Show mutation data immediately after ranking, then switch to query data
  const displayData = rankMutation.data ?? cachedResults
  const candidates = displayData?.ranked_candidates ?? []
  const isRanking = rankMutation.isPending

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/jobs/${jobId}`}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Candidate Rankings</h1>
            {job && (
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-medium text-gray-700">{job.title}</span> ·{' '}
                {job.resume_count} resume(s) uploaded
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Top-K filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="input-field w-auto text-sm py-1.5"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>

          {candidates.length > 0 && (
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> PDF Report
            </button>
          )}

          <button
            onClick={() => rankMutation.mutate()}
            disabled={isRanking}
            className="btn-primary flex items-center gap-2"
          >
            {isRanking ? (
              <>
                <LoadingSpinner size="sm" /> Ranking…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Run AI Ranking
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI processing indicator */}
      {isRanking && (
        <div className="card text-center py-10">
          <LoadingSpinner size="lg" className="mx-auto mb-5" />
          <h3 className="font-bold text-gray-800 text-lg">AI is analysing candidates…</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Generating vector embeddings, running similarity search, and creating LLM summaries
            for the top candidates. This may take 1–3 minutes.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
            <span>✓ PDF text extracted</span>
            <span>⟳ Computing embeddings</span>
            <span>⟳ LLM summaries</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isRanking && candidates.length === 0 && (
        <div className="card text-center py-16">
          <Trophy className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-600">No rankings yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Upload resumes for this job, then click{' '}
            <strong>&quot;Run AI Ranking&quot;</strong> to rank candidates.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Link
              to={`/jobs/${jobId}/upload`}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" /> Upload Resumes
            </Link>
          </div>
        </div>
      )}

      {/* Ranked candidates */}
      {!isRanking && candidates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} ranked
          </p>
          {candidates.map((resume, idx) => (
            <CandidateCard key={resume.id} resume={resume} rank={idx + 1} jobId={jobId} />
          ))}
        </div>
      )}
    </div>
  )
}
