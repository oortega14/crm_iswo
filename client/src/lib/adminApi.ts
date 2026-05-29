import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/** Cliente para endpoints super-admin (`X-Admin-Token`). */
export function createAdminClient(adminToken: string) {
  return axios.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Admin-Token': adminToken,
    },
  })
}
