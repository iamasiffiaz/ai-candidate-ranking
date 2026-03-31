import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Edit,
  MapPin,
  Save,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { jobService } from '../services/jobService'
import LoadingSpinner from '../components/LoadingSpinner'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJob(id),
  })

  const { register, handleSubmit } = useForm({ values: job })

  const updateMutation = useMutation({
    mutationFn: (data) => jobService.updateJob(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job updated')
      setEditing(false)
    },
    onError: () => toast.error('Failed to update job'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => jobService.deleteJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      navigate('/jobs')
      toast.success('Job deleted')
    },
    onError: () => toast.error('Failed to delete job'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!job) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/jobs"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{job.title}</h1>
            <span
              className={`badge mt-1 ${
                job.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {job.is_active ? 'Active' : 'Closed'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/jobs/${id}/upload`}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" /> Upload
          </Link>
          <Link
            to={`/jobs/${id}/rankings`}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Trophy className="w-4 h-4" /> Rankings
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${job.title}"?`)) deleteMutation.mutate()
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing ? (
        /* ── Edit form ── */
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Edit Job</h2>
          <form
            onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input className="input-field" {...register('title')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input className="input-field" {...register('location')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                <input className="input-field" {...register('salary_range')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input-field" {...register('is_active')}>
                <option value="true">Active</option>
                <option value="false">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={5} {...register('description')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
              <textarea className="input-field" rows={3} {...register('requirements')} />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ── View mode ── */
        <div className="space-y-4">
          <div className="card">
            {/* Meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-sm text-gray-500">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {job.location}
                </span>
              )}
              {job.salary_range && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {job.salary_range}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-gray-400" />
                {job.resume_count} resume(s)
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </div>

          {job.requirements && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.requirements}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
