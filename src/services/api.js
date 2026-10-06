import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: import.meta.env.DEV ? '' : API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

export default api
