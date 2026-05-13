import { useState, useEffect } from 'react'
import { sensorService, measurementService } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function History() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [selectedParam, setSelectedParam] = useState('temperature')

    const now = new Date()
    const past = new Date(now - 24 * 60 * 60 * 1000)
    const [from, setFrom] = useState(past.toISOString().slice(0, 16))
    const [to, setTo] = useState(now.toISOString().slice(0, 16))

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
            const res = await measurementService.getByRange(
                selectedSensor,
                new Date(from).toISOString(),
                new Date(to).toISOString()
            )
            const formatted = res.data.map(m => ({
                time: new Date(m.timestamp).toLocaleTimeString('hr-HR'),
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
        <div style={{ padding: '20px' }}>
            <h1>Povijest mjerenja</h1>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                    <label>Senzor: </label>
                    <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}>
                        {sensors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Parametar: </label>
                    <select value={selectedParam} onChange={e => setSelectedParam(e.target.value)}>
                        {Object.entries(params).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Od: </label>
                    <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
                </div>

                <div>
                    <label>Do: </label>
                    <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
                </div>

                <button onClick={handleSearch}>Pretraži</button>
            </div>

            {loading && <p>Učitavanje...</p>}

            {!loading && data.length === 0 && (
                <p style={{ color: '#999' }}>Nema podataka za odabrani period.</p>
            )}

            {!loading && data.length > 0 && (
                <>
                    <p>Ukupno mjerenja: {data.length}</p>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={selectedParam}
                                stroke={params[selectedParam].color}
                                dot={false}
                                name={params[selectedParam].label}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            )}
        </div>
    )
}

export default History