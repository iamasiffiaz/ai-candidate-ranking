import api from './api'

export const jobService = {
  getJobs: async (params = {}) => {
    const { data } = await api.get('/jobs', { params })
    return data
  },

  getJob: async (id) => {
    const { data } = await api.get(`/jobs/${id}`)
    return data
  },

  createJob: async (jobData) => {
    const { data } = await api.post('/jobs', jobData)
    return data
  },

  updateJob: async (id, jobData) => {
    const { data } = await api.put(`/jobs/${id}`, jobData)
    return data
  },

  deleteJob: async (id) => {
    await api.delete(`/jobs/${id}`)
  },
}
