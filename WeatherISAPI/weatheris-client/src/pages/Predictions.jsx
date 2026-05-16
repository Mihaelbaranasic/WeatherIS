import { useState, useEffect } from 'react'
import { sensorService, predictionService } from '../services/api'
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid,
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
                        {entry.name}: <strong>{entry.value}°C</strong>
                    </p>
                ))}
            </div>
        )
    }
    return null
}

function Predictions() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [comparisonData, setComparisonData] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [loadingComparison, setLoadingComparison] = useState(false)
    const [horizon, setHorizon] = useState(384)

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

    const loadComparison = async (sensorId, currentHorizon) => {
        setLoadingComparison(true)
        try {
            const res = await predictionService.getComparison(sensorId, currentHorizon)
            const ssa = res.data.ssa ?? res.data.SSA ?? []
            const lr = res.data.linearRegression ?? res.data.LinearRegression ?? []
            const ft = res.data.fastTree ?? res.data.FastTree ?? []
            const openMeteo = res.data.openMeteo ?? res.data.OpenMeteo ?? []
            const pft = res.data.physicalFastTree ?? res.data.PhysicalFastTree ?? []
            const groupedByDay = res.data.groupedByDay ?? true

            const normalizeTime = (time) => {
                const d = new Date(time)
                d.setMinutes(0, 0, 0)
                return d.toISOString()
            }

            const formatTime = (isoTime) => {
                const d = new Date(isoTime)
                if (groupedByDay) {
                    return d.toLocaleDateString('hr-HR', { month: 'short', day: 'numeric' })
                } else if (currentHorizon <= 24) {
                    return d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
                } else {
                    return d.toLocaleString('hr-HR', { month: 'short', day: 'numeric', hour: '2-digit' })
                }
            }

            const ssaMap = Object.fromEntries(ssa.map(p => [normalizeTime(p.time), p.temperature]))
            const lrMap = Object.fromEntries(lr.map(p => [normalizeTime(p.time), p.temperature]))
            const ftMap = Object.fromEntries(ft.map(p => [normalizeTime(p.time), p.temperature]))
            const omMap = Object.fromEntries(openMeteo.map(p => [normalizeTime(p.time), p.temperature]))
            const pftMap = Object.fromEntries(pft.map(p => [normalizeTime(p.time), p.temperature]))

            const allDates = new Set([
                ...Object.keys(ssaMap),
                ...Object.keys(lrMap),
                ...Object.keys(ftMap),
                ...Object.keys(omMap),
                ...Object.keys(pftMap)
            ])

            const merged = Array.from(allDates).sort().map(time => ({
                time: formatTime(time),
                'SSA': ssaMap[time] ?? null,
                'Linear Regression': lrMap[time] ?? null,
                'FastTree': ftMap[time] ?? null,
                'OpenMeteo': omMap[time] ?? null,
                'Physical FastTree': pftMap[time] ?? null
            }))

            setComparisonData(merged)
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setLoadingComparison(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedSensor) return
        setGenerating(true)
        try {
            await predictionService.generate(selectedSensor, horizon)
            await loadComparison(selectedSensor, horizon)
        } catch (err) {
            console.error('Greška pri generiranju:', err)
        } finally {
            setGenerating(false)
        }
    }

    const handleSensorChange = (e) => {
        setSelectedSensor(e.target.value)
        setComparisonData(null)
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Predikcije
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    ML model vs OpenMeteo prognoza
                </p>
            </div>

            {/* Controls */}
            <div className="rounded-xl p-4 border mb-6 flex gap-4 flex-wrap items-end"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Senzor</label>
                    <select value={selectedSensor} onChange={handleSensorChange}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Horizont</label>
                    <select value={horizon} onChange={e => setHorizon(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value={24}>1 dan (24h)</option>
                        <option value={72}>3 dana (72h)</option>
                        <option value={168}>7 dana (168h)</option>
                        <option value={384}>16 dana (384h)</option>
                    </select>
                </div>

                <button onClick={handleGenerate} disabled={generating}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                    {generating ? 'Generiranje...' : 'Generiraj predikcije'}
                </button>

                <button onClick={() => loadComparison(selectedSensor, horizon)} disabled={loadingComparison}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {loadingComparison ? 'Učitavanje...' : 'Učitaj usporedbu'}
                </button>
            </div>

            {/* Chart */}
            {loadingComparison && (
                <div className="flex items-center justify-center py-20">
                    <p style={{ color: 'var(--text-secondary)' }}>Učitavanje usporedbe...</p>
                </div>
            )}

            {!loadingComparison && comparisonData && comparisonData.length > 0 && (
                <div className="rounded-xl p-4 border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        Usporedba predikcija temperature
                    </p>

                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                label={{ value: '°C', position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                            <Line type="monotone" dataKey="SSA" stroke="#ff7300" strokeWidth={2.5} dot={false} connectNulls={false} />
                            <Line type="monotone" dataKey="Linear Regression" stroke="#8b5cf6" strokeWidth={2.5} dot={false} connectNulls={false} />
                            <Line type="monotone" dataKey="FastTree" stroke="#f59e0b" strokeWidth={2.5} dot={false} connectNulls={false} />
                            <Line type="monotone" dataKey="OpenMeteo" stroke="#00c49f" strokeWidth={2.5} dot={false} connectNulls={false} />
                            <Line type="monotone" dataKey="Physical FastTree" stroke="#ec4899" strokeWidth={2.5} dot={false} connectNulls={false} />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!loadingComparison && !comparisonData && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-5xl mb-4">🔮</div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                        Nema predikcija
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Generiraj predikcije ili učitaj postojeće usporedbe.
                    </p>
                </div>
            )}
        </div>
    )
}

export default Predictions