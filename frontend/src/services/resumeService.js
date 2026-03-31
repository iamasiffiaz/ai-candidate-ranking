import api from './api'

export const resumeService = {
  uploadResumes: async (jobId, files, onUploadProgress) => {
    const formData = new FormData()
    formData.append('job_id', jobId)
    files.forEach((file) => formData.append('files', file))

    const { data } = await api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    return data
  },

  getResumesForJob: async (jobId) => {
    const { data } = await api.get(`/resumes/job/${jobId}`)
    return data
  },

  getResume: async (id) => {
    const { data } = await api.get(`/resumes/${id}`)
    return data
  },

  deleteResume: async (id) => {
    await api.delete(`/resumes/${id}`)
  },
}
