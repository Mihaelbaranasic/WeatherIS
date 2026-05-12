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

export const measurementService = {
    getBySensor: (sensorId) => api.get(`/measurements/sensor/${sensorId}`),
    getLatest: (sensorId) => api.get(`/measurements/sensor/${sensorId}/latest`),
    getByRange: (sensorId, from, to) =>
        api.get(`/measurements/sensor/${sensorId}/range`, { params: { from, to } })
}

export const predictionService = {
    generate: (sensorId, horizon = 24) =>
        api.post(`/predictions/sensor/${sensorId}`, null, { params: { horizon } }),
    getBySensor: (sensorId) => api.get(`/predictions/sensor/${sensorId}`),
    evaluate: (sensorId) => api.get(`/predictions/sensor/${sensorId}/evaluate`)
}

export const alertService = {
    getAllActive: () => api.get('/alerts/active'),
    getBySensor: (sensorId) => api.get(`/alerts/sensor/${sensorId}`),
    resolve: (id) => api.patch(`/alerts/${id}/resolve`)
}