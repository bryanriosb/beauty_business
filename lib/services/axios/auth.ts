import axios, { AxiosInstance } from 'axios'
import { selectedEnvironment } from '.'

const config = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

// Request to api without authentication
export const api: AxiosInstance = axios.create(config)
api.interceptors.request.use((request) => {
  request.baseURL = selectedEnvironment.BASE_URL
  return request
})

// Request to api with authentication and refresh token
const apiAuth: AxiosInstance = axios.create(config)
apiAuth.interceptors.request.use(
  async (request) => {
    // const tokenCookie = await getCookie('mentorAuthToken')
    request.baseURL = selectedEnvironment.BASE_URL
    request.headers['X-Tenant-ID'] = `d44079db-5848-4aff-b160-11d2e8a7d6ae`

    const fullUrl = request.baseURL
      ? request.baseURL + request.url
      : request.url
    console.log('URL completa:', fullUrl)

    return request
  },
  (err) => err
)

export default apiAuth
