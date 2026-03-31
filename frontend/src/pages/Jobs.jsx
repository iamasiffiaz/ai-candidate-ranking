import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  Briefcase,
  DollarSign,
  MapPin,
  Plus,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { jobService } from '../services/jobService'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Jobs() {
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getJobs({ active_only: false }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const createMutation = useMutation({
    mutationFn: jobService.createJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job created successfully!')
      setShowModal(false)
      reset()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create job'),
  })

  const deleteMutation = useMutation({
    mutationFn: jobService.deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job deleted')
    },
    onError: () => toast.error('Failed to delete job'),
  })

  const confirmDelete = (id, title) => {
    if (window.confirm(`Delete "${title}"? This will also remove all associated resumes.`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Job Descriptions</h1>
          <p className="text-gray-500 mt-1">Manage postings and rank candidates with AI.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-500">No jobs yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first job posting to get started.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            + Create Job
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="card hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                    <span
                      className={`badge ${
                        job.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {job.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                    )}
                    {job.salary_range && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary_range}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {job.resume_count} resume(s) uploaded
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link
                    to={`/jobs/${job.id}/upload`}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </Link>
                  <Link
                    to={`/jobs/${job.id}/rankings`}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Rankings
                  </Link>
                  <button
                    onClick={() => confirmDelete(job.id, job.title)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Job</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  reset()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((d) => createMutation.mutate(d))}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Senior React Developer"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location
                  </label>
                  <input
                    className="input-field"
                    placeholder="Remote / New York"
                    {...register('location')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Salary Range
                  </label>
                  <input
                    className="input-field"
                    placeholder="$80k – $120k"
                    {...register('salary_range')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what you're looking for…"
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Requirements
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="List key skills, qualifications, and experience required…"
                  {...register('requirements')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" /> Creating…
                    </span>
                  ) : (
                    'Create Job'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    reset()
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
