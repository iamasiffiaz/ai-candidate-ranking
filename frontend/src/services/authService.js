import api from './api'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    return data // { access_token, token_type, user }
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData)
    return data
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },
}
