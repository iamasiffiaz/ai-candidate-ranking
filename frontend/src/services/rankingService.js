import api from './api'

export const rankingService = {
  /** Trigger the full AI ranking pipeline for a job. */
  rankCandidates: async (jobId, params = {}) => {
    const { data } = await api.post(`/ranking/${jobId}/rank`, null, { params })
    return data
  },

  /** Fetch previously computed ranking results. */
  getRankingResults: async (jobId, params = {}) => {
    const { data } = await api.get(`/ranking/${jobId}/results`, { params })
    return data
  },

  /** Get (or generate) AI analysis for a specific candidate. */
  getCandidateAnalysis: async (jobId, resumeId, params = {}) => {
    const { data } = await api.get(`/ranking/${jobId}/candidate/${resumeId}`, { params })
    return data
  },

  /** Download the PDF ranking report. Returns the raw axios response. */
  downloadReport: async (jobId, topK = 20) => {
    return api.get(`/reports/${jobId}/download`, {
      params: { top_k: topK },
      responseType: 'blob',
    })
  },
}
