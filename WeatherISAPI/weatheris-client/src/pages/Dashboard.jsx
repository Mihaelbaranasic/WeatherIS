import { useState, useEffect } from 'react'
import { weatherService } from '../services/api'

function Dashboard() {
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(true)
    const [lastUpdate, setLastUpdate] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await weatherService.getCurrentAll()
                setSensorData(res.data)
                setLastUpdate(new Date())
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 60000)
        return () => clearInterval(interval)
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka s OpenMeteo...</p>
            </div>
        </div>
    )

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        Dashboard
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {sensorData.length} aktivnih senzora
                        {lastUpdate && ` · Ažurirano ${lastUpdate.toLocaleTimeString('hr-HR')}`}
                    </p>
                </div>
            </div>

            {sensorData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-5xl mb-4">🌐</div>
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Nema aktivnih senzora
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Dodaj senzore na stranici Senzori.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sensorData.map(item => (
                        <div key={item.sensorId}
                            className="rounded-xl p-4 border transition-all duration-200 hover:scale-105 cursor-pointer"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {item.sensorName}
                                    </h3>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        {item.location}
                                    </p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}>
                                    ● Live
                                </span>
                            </div>

                            <div className="text-3xl font-bold mb-3" style={{ color: 'var(--accent-blue)' }}>
                                {item.weather.temperature}°C
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg p-2" style={{ background: 'var(--bg-secondary)' }}>
                                    <div style={{ color: 'var(--text-secondary)' }}>Vlažnost</div>
                                    <div className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                        {item.weather.humidity}%
                                    </div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'var(--bg-secondary)' }}>
                                    <div style={{ color: 'var(--text-secondary)' }}>Tlak</div>
                                    <div className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                        {item.weather.pressure} hPa
                                    </div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'var(--bg-secondary)' }}>
                                    <div style={{ color: 'var(--text-secondary)' }}>Vjetar</div>
                                    <div className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                        {item.weather.windSpeed} km/h
                                    </div>
                                </div>
                                <div className="rounded-lg p-2" style={{ background: 'var(--bg-secondary)' }}>
                                    <div style={{ color: 'var(--text-secondary)' }}>Oborine</div>
                                    <div className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                        {item.weather.precipitation} mm
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                                {new Date(item.weather.timestamp).toLocaleString('hr-HR')}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Dashboard