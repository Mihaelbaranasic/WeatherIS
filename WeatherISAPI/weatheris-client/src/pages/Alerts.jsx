import { useState, useEffect } from 'react'
import { alertService } from '../services/api'

function Alerts() {
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await alertService.getAllActive()
                setAlerts(res.data)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchAlerts()
    }, [])

    const handleResolve = async (id) => {
        try {
            await alertService.resolve(id)
            setAlerts(alerts.filter(a => a.id !== id))
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const paramLabels = {
        Temperature: 'Temperatura',
        WindSpeed: 'Brzina vjetra',
        Humidity: 'Vlažnost',
        Pressure: 'Tlak'
    }

    if (loading) return <p style={{ padding: '20px' }}>Učitavanje...</p>

    return (
        <div style={{ padding: '20px' }}>
            <h1>Aktivni alarmi</h1>

            {alerts.length === 0 && (
                <p style={{ color: '#999' }}>Nema aktivnih alarma.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map(alert => (
                    <div key={alert.id} style={{
                        border: '1px solid #ffaaaa',
                        borderLeft: '4px solid #ff0000',
                        borderRadius: '8px',
                        padding: '16px',
                        background: '#fff5f5'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>⚠️ {paramLabels[alert.parameter] || alert.parameter}</strong>
                                <span style={{ marginLeft: '8px', color: '#666' }}>Senzor ID: {alert.sensorId}</span>
                            </div>
                            <button
                                onClick={() => handleResolve(alert.id)}
                                style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}
                            >
                                Razriješi
                            </button>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '14px' }}>
                            <span>Izmjereno: <strong>{alert.measuredValue}</strong></span>
                            <span style={{ marginLeft: '16px' }}>Prag: <strong>{alert.thresholdValue}</strong></span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                            {new Date(alert.triggeredAt).toLocaleString('hr-HR')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Alerts