import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CheckCircle, Trophy, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { jobService } from '../services/jobService'
import { resumeService } from '../services/resumeService'
import FileUpload from '../components/FileUpload'
import LoadingSpinner from '../components/LoadingSpinner'

export default function UploadResumes() {
  const { id: jobId } = useParams()
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getJob(jobId),
  })

  const handleUpload = async () => {
    if (!files.length) {
      toast.error('Please select at least one PDF resume')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const data = await resumeService.uploadResumes(jobId, files, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded * 100) / evt.total))
        }
      })
      setResult(data)
      if (data.uploaded > 0) {
        toast.success(`${data.uploaded} resume${data.uploaded !== 1 ? 's' : ''} uploaded!`)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setFiles([])
    setProgress(0)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={job ? `/jobs/${jobId}` : '/jobs'}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Upload Resumes</h1>
          {job && (
            <p className="text-sm text-gray-500 mt-0.5">
              For: <span className="font-medium text-gray-700">{job.title}</span>
            </p>
          )}
        </div>
      </div>

      {/* Upload area */}
      {!result ? (
        <div className="card space-y-6">
          <FileUpload onFilesSelected={setFiles} maxFiles={30} />

          {uploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Uploading & processing…</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Extracting text and generating embeddings…
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !files.length}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" /> Processing {files.length} file
                {files.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {files.length > 0 ? files.length : ''} Resume
                {files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-400">
            Only PDF files accepted · Max 10 MB per file · Up to 30 files at once
          </p>
        </div>
      ) : (
        /* Result card */
        <div className="card space-y-5 animate-fade-in">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                result.uploaded > 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              {result.uploaded > 0 ? (
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              ) : (
                <AlertCircle className="w-7 h-7 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Upload Complete</h2>
              <p className="text-sm text-gray-500">
                <span className="text-emerald-600 font-semibold">{result.uploaded} uploaded</span>
                {result.failed > 0 && (
                  <span className="text-red-500 font-semibold"> · {result.failed} failed</span>
                )}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Errors
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 pl-6">
                  {e}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary flex-1">
              Upload More
            </button>
            <Link
              to={`/jobs/${jobId}/rankings`}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" /> View Rankings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
