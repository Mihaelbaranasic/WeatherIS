import { useState, useEffect } from 'react'
import { sensorService, weatherService } from '../services/api'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg p-3 border text-sm"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color }}>
                        {entry.name}: <strong>{entry.value}</strong>
                    </p>
                ))}
            </div>
        )
    }
    return null
}

function History() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [days, setDays] = useState(7)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await sensorService.getAll()
                setSensors(res.data)
                if (res.data.length > 0) setSelectedSensor(String(res.data[0].id))
            } catch (err) {
                console.error('Greška:', err)
            }
        }
        load()
    }, [])

    const handleSearch = async () => {
        if (!selectedSensor) return
        setLoading(true)
        try {
            const res = await weatherService.getHistory(selectedSensor, days)

            let formatted = res.data.map(m => ({
                time: new Date(m.timestamp),
                temperatura: m.temperature,
                vlaznost: m.humidity,
                tlak: m.pressure,
                vjetar: m.windSpeed,
                oborine: m.precipitation
            }))

            if (days > 7) {
                const grouped = {}
                formatted.forEach(m => {
                    const key = m.time.toLocaleDateString('hr-HR')
                    if (!grouped[key]) grouped[key] = { items: [], key }
                    grouped[key].items.push(m)
                })

                formatted = Object.values(grouped).map(g => ({
                    time: g.key,
                    'Temperatura (°C)': Math.round(g.items.reduce((s, m) => s + m.temperatura, 0) / g.items.length * 10) / 10,
                    'Vlažnost (%)': Math.round(g.items.reduce((s, m) => s + m.vlaznost, 0) / g.items.length),
                    'Tlak (hPa)': Math.round(g.items.reduce((s, m) => s + m.tlak, 0) / g.items.length),
                    'Vjetar (km/h)': Math.round(g.items.reduce((s, m) => s + m.vjetar, 0) / g.items.length * 10) / 10,
                    'Oborine (mm)': Math.round(g.items.reduce((s, m) => s + m.oborine, 0) * 10) / 10
                }))
            } else {
                formatted = formatted.map(m => ({
                    time: m.time.toLocaleString('hr-HR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    'Temperatura (°C)': m.temperatura,
                    'Vlažnost (%)': m.vlaznost,
                    'Tlak (hPa)': m.tlak,
                    'Vjetar (km/h)': m.vjetar,
                    'Oborine (mm)': m.oborine
                }))
            }

            setData(formatted)
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Povijest mjerenja
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Povijesni podaci s OpenMeteo API-ja
                </p>
            </div>

            <div className="flex gap-4 flex-wrap mb-6 items-end">
                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Senzor</label>
                    <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Period</label>
                    <select value={days} onChange={e => setDays(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value={3}>3 dana</option>
                        <option value={7}>7 dana</option>
                        <option value={14}>14 dana</option>
                        <option value={30}>30 dana</option>
                        <option value={60}>60 dana</option>
                        <option value={90}>90 dana</option>
                    </select>
                </div>

                <button onClick={handleSearch}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                    Pretraži
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka s OpenMeteo...</p>
                </div>
            )}

            {!loading && data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                    <i className="fa-solid fa-chart-line" style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                        Odaberi senzor i period
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Pritisni Pretraži za prikaz podataka.
                    </p>
                </div>
            )}

            {!loading && data.length > 0 && (
                <>
                    <div className="rounded-xl p-4 border mb-4"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Temperatura i oborine
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {data.length} {days > 7 ? 'dnevnih prosjeka' : 'satnih mjerenja'}
                            </p>
                        </div>

                        <ResponsiveContainer width="100%" height={380}>
                            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    yAxisId="temp"
                                    orientation="left"
                                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                    label={{ value: '°C', position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                                />
                                <YAxis
                                    yAxisId="precip"
                                    orientation="right"
                                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                    label={{ value: 'mm', position: 'insideRight', fill: 'var(--text-secondary)', fontSize: 11 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                                <Bar
                                    yAxisId="precip"
                                    dataKey="Oborine (mm)"
                                    fill="rgba(59, 130, 246, 0.5)"
                                    radius={[2, 2, 0, 0]}
                                />
                                <Line
                                    yAxisId="temp"
                                    type="monotone"
                                    dataKey="Temperatura (°C)"
                                    stroke="#ff7300"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl p-4 border"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                            Vlažnost i brzina vjetra
                        </p>
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                                <Line
                                    type="monotone"
                                    dataKey="Vlažnost (%)"
                                    stroke="#0088fe"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Vjetar (km/h)"
                                    stroke="#8884d8"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    )
}

export default History