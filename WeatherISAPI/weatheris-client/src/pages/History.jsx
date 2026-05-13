import { useState, useEffect } from 'react'
import { sensorService, weatherService } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function History() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [selectedParam, setSelectedParam] = useState('temperature')
    const [days, setDays] = useState(30)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchSensors = async () => {
            try {
                const res = await sensorService.getAll()
                setSensors(res.data)
                if (res.data.length > 0) setSelectedSensor(res.data[0].id)
            } catch (err) {
                console.error('Greška:', err)
            }
        }
        fetchSensors()
    }, [])

    const handleSearch = async () => {
        if (!selectedSensor) return
        setLoading(true)
        try {
            const res = await weatherService.getHistory(selectedSensor, days)
            const formatted = res.data.map(m => ({
                time: new Date(m.timestamp).toLocaleDateString('hr-HR'),
                temperature: m.temperature,
                humidity: m.humidity,
                pressure: m.pressure,
                windSpeed: m.windSpeed,
                precipitation: m.precipitation
            }))
            setData(formatted)
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setLoading(false)
        }
    }

    const params = {
        temperature: { label: 'Temperatura (°C)', color: '#ff7300' },
        humidity: { label: 'Vlažnost (%)', color: '#0088fe' },
        pressure: { label: 'Tlak (hPa)', color: '#00c49f' },
        windSpeed: { label: 'Brzina vjetra (km/h)', color: '#8884d8' },
        precipitation: { label: 'Oborine (mm)', color: '#82ca9d' }
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                Povijest mjerenja
            </h1>

            <div className="flex gap-4 flex-wrap mb-6 items-end">
                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Senzor</label>
                    <select
                        value={selectedSensor}
                        onChange={e => setSelectedSensor(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        {sensors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Parametar</label>
                    <select
                        value={selectedParam}
                        onChange={e => setSelectedParam(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        {Object.entries(params).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Period (dana)</label>
                    <select
                        value={days}
                        onChange={e => setDays(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        <option value={7}>7 dana</option>
                        <option value={14}>14 dana</option>
                        <option value={30}>30 dana</option>
                        <option value={60}>60 dana</option>
                        <option value={90}>90 dana</option>
                    </select>
                </div>

                <button
                    onClick={handleSearch}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                    Pretraži
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka...</p>
                </div>
            )}

            {!loading && data.length === 0 && (
                <div className="flex items-center justify-center py-20">
                    <p style={{ color: 'var(--text-secondary)' }}>Odaberi senzor i period pa pritisni Pretraži.</p>
                </div>
            )}

            {!loading && data.length > 0 && (
                <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Ukupno mjerenja: {data.length}
                    </p>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                labelStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={selectedParam}
                                stroke={params[selectedParam].color}
                                strokeWidth={2}
                                dot={false}
                                name={params[selectedParam].label}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

export default History