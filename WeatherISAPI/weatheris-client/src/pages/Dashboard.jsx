import { useState, useEffect, useRef } from 'react'
import { sensorService, measurementService } from '../services/api'

function Dashboard() {
    const [sensors, setSensors] = useState([])
    const [latestMeasurements, setLatestMeasurements] = useState({})
    const [loading, setLoading] = useState(true)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true

        const fetchData = async () => {
            try {
                const sensorsRes = await sensorService.getActive()
                if (!mountedRef.current) return
                setSensors(sensorsRes.data)

                const measurements = {}
                for (const sensor of sensorsRes.data) {
                    try {
                        const res = await measurementService.getLatest(sensor.id)
                        measurements[sensor.id] = res.data
                    } catch {
                        measurements[sensor.id] = null
                    }
                }
                if (!mountedRef.current) return
                setLatestMeasurements(measurements)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                if (mountedRef.current) setLoading(false)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 30000)

        return () => {
            mountedRef.current = false
            clearInterval(interval)
        }
    }, [])

    if (loading) return <p>Učitavanje...</p>

    return (
        <div style={{ padding: '20px' }}>
            <h1>Dashboard</h1>
            <p>Aktivni senzori: {sensors.length}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {sensors.map(sensor => {
                    const m = latestMeasurements[sensor.id]
                    return (
                        <div key={sensor.id} style={{
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            padding: '16px',
                            minWidth: '220px'
                        }}>
                            <h3>{sensor.name}</h3>
                            <p style={{ color: '#666', fontSize: '14px' }}>{sensor.location}</p>
                            {m ? (
                                <>
                                    <p>🌡️ Temperatura: <strong>{m.temperature}°C</strong></p>
                                    <p>💧 Vlažnost: <strong>{m.humidity}%</strong></p>
                                    <p>🌬️ Tlak: <strong>{m.pressure} hPa</strong></p>
                                    <p>💨 Vjetar: <strong>{m.windSpeed} km/h</strong></p>
                                    <p style={{ fontSize: '12px', color: '#999' }}>
                                        {new Date(m.timestamp).toLocaleString('hr-HR')}
                                    </p>
                                </>
                            ) : (
                                <p>Nema podataka</p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Dashboard