import axios from 'axios'

const api = axios.create({
    baseURL: 'https://localhost:7068/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

export const sensorService = {
    getAll: () => api.get('/sensors'),
    getActive: () => api.get('/sensors/active'),
    getById: (id) => api.get(`/sensors/${id}`),
    create: (sensor) => api.post('/sensors', sensor),
    update: (id, sensor) => api.put(`/sensors/${id}`, sensor),
    delete: (id) => api.delete(`/sensors/${id}`),
    toggle: (id) => api.patch(`/sensors/${id}/toggle`)
}

export const weatherService = {
    getCurrentAll: () => api.get('/weather/current'),
    getCurrent: (sensorId) => api.get(`/weather/current/${sensorId}`),
    getHistory: (sensorId, days = 30) => api.get(`/weather/history/${sensorId}`, { params: { days } })
}

export const predictionService = {
    generate: (sensorId, horizon = 384) =>
        api.post(`/predictions/sensor/${sensorId}`, null, { params: { horizon } }),
    getBySensor: (sensorId) => api.get(`/predictions/sensor/${sensorId}`),
    evaluate: (sensorId) => api.get(`/predictions/sensor/${sensorId}/evaluate`),
    getComparison: (sensorId) => api.get(`/predictions/compare/${sensorId}`)
}

export const alertService = {
    getAllActive: () => api.get('/alerts/active'),
    getBySensor: (sensorId) => api.get(`/alerts/sensor/${sensorId}`),
    resolve: (id) => api.patch(`/alerts/${id}/resolve`)
}