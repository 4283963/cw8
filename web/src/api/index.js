import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API 请求错误:', error)
    return Promise.reject(error)
  }
)

export const getShipments = (status) => {
  return api.get('/shipments', { params: { status } })
}

export const getTemperatureHistory = (shipmentId, limit = 50) => {
  return api.get(`/temperature/history/${shipmentId}`, { params: { limit } })
}

export const getLatestTemperatures = () => {
  return api.get('/temperature/latest')
}

export const getAlerts = (params = {}) => {
  return api.get('/alerts', { params })
}

export const getUnresolvedAlerts = () => {
  return api.get('/alerts/unresolved')
}

export const resolveAlert = (id, note) => {
  return api.patch(`/alerts/${id}/resolve`, { note })
}

export default api
