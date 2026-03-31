import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, Plus, TrendingUp, Upload, Users } from 'lucide-react'
import { jobService } from '../services/jobService'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getJobs(),
  })

  const activeJobs = jobs.filter((j) => j.is_active).length
  const totalResumes = jobs.reduce((sum, j) => sum + (j.resume_count || 0), 0)

  const stats = [
    {
      label: 'Active Jobs',
      value: activeJobs,
      icon: Briefcase,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    {
      label: 'Total Resumes',
      value: totalResumes,
      icon: Users,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: 'Total Jobs',
      value: jobs.length,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
    },
  ]

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Welcome back, {firstName}! 👋</h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your AI-powered recruitment pipeline.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-5">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
              )}
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions + recent jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/jobs"
              className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">Create New Job</p>
                <p className="text-xs text-blue-400">Post a job description</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/jobs"
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">Upload Resumes</p>
                <p className="text-xs text-emerald-400">Select a job to upload to</p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Recent jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Jobs</h2>
            <Link
              to="/jobs"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No jobs yet. Create your first one!</p>
              <Link to="/jobs" className="btn-primary mt-3 text-sm py-1.5 px-4">
                + New Job
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {jobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-400">{job.resume_count} resume(s)</p>
                  </div>
                  <span
                    className={`badge ${
                      job.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {job.is_active ? 'Active' : 'Closed'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
