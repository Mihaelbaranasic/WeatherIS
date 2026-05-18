import { useState, useEffect } from 'react'
import { sensorService, weatherService, predictionService } from '../services/api'
import {
    ScatterChart, Scatter, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts'

const TABS = [
    { id: 'stats', label: 'Deskriptivne statistike' },
    { id: 'distribution', label: 'Distribucije' },
    { id: 'correlation', label: 'Korelacijska matrica' },
    { id: 'scatter', label: 'Scatter plotovi' },
    { id: 'models', label: 'Usporedba modela' },
    { id: 'predicted', label: 'Predviđeno vs stvarno' },
]

const MODEL_COLORS = {
    SSA: '#ff7300',
    'Linear Regression': '#8b5cf6',
    FastTree: '#f59e0b',
    'Physical FastTree': '#ec4899',
    Stvarno: '#00c49f'
}

const VARIABLES = ['temperature', 'humidity', 'pressure', 'windSpeed', 'precipitation']
const VAR_LABELS = {
    temperature: 'Temp.',
    humidity: 'Vlažnost',
    pressure: 'Tlak',
    windSpeed: 'Vjetar',
    precipitation: 'Oborine'
}

const CORR_KEYS = {
    'temperature-humidity': 'tempHumidity',
    'temperature-pressure': 'tempPressure',
    'temperature-windSpeed': 'tempWind',
    'temperature-precipitation': 'tempPrecip',
    'humidity-pressure': 'humidityPressure',
    'humidity-windSpeed': 'humidityWind',
    'humidity-precipitation': 'humidityPrecip',
    'pressure-windSpeed': 'pressureWind',
    'pressure-precipitation': 'pressurePrecip',
    'windSpeed-precipitation': 'windPrecip',
}

const VAR_CONFIGS = [
    { key: 'temperature', label: 'Temperatura (°C)', color: '#ff7300' },
    { key: 'humidity', label: 'Vlažnost (%)', color: '#0088fe' },
    { key: 'pressure', label: 'Tlak (hPa)', color: '#00c49f' },
    { key: 'windSpeed', label: 'Brzina vjetra (km/h)', color: '#8884d8' },
    { key: 'precipitation', label: 'Oborine (mm)', color: '#82ca9d' },
]

function getCorrelationColor(value) {
    const abs = Math.abs(value)
    if (value > 0) {
        const r = Math.round(59 + (239 - 59) * abs)
        const g = Math.round(130 - 130 * abs)
        const b = Math.round(246 - 246 * abs)
        return `rgb(${r},${g},${b})`
    }
    const r = Math.round(239 * abs)
    const g = Math.round(68 * abs)
    const b = Math.round(68 + (180 - 68) * abs)
    return `rgb(${r},${g},${b})`
}

function getMetricColor(value, thresholds) {
    if (value === null || value === undefined) return 'var(--text-secondary)'
    const [good, ok] = thresholds
    if (value <= good) return 'var(--accent-green)'
    if (value <= ok) return 'var(--accent-orange)'
    return 'var(--accent-red)'
}

function getR2Color(value) {
    if (value === null || value === undefined) return 'var(--text-secondary)'
    if (value > 0.8) return 'var(--accent-green)'
    if (value > 0.5) return 'var(--accent-orange)'
    return 'var(--accent-red)'
}

function getR2Label(value) {
    if (value === null || value === undefined) return 'N/A'
    if (value > 0.8) return 'Odličan'
    if (value > 0.5) return 'Dobar'
    return 'Slab'
}

function StatCard({ label, value, unit }) {
    return (
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {value}{unit ?? ''}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        </div>
    )
}

function Evaluation() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [activeTab, setActiveTab] = useState('stats')
    const [statistics, setStatistics] = useState(null)
    const [evaluation, setEvaluation] = useState(null)
    const [loadingStats, setLoadingStats] = useState(false)
    const [loadingEval, setLoadingEval] = useState(false)
    const [scatterX, setScatterX] = useState('temperature')
    const [scatterY, setScatterY] = useState('humidity')
    const [days, setDays] = useState(90)

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

    const handleLoad = async () => {
        if (!selectedSensor) return
        setLoadingStats(true)
        setLoadingEval(true)

        const statsLoad = async () => {
            try {
                const statsRes = await weatherService.getStatistics(selectedSensor, days)
                setStatistics(statsRes.data)
            } catch (err) {
                console.error('Greška pri dohvatu statistika:', err)
            } finally {
                setLoadingStats(false)
            }
        }

        const evalLoad = async () => {
            try {
                const evalRes = await predictionService.evaluate(selectedSensor)
                setEvaluation(evalRes.data)
            } catch (err) {
                console.error('Greška pri evaluaciji:', err)
            } finally {
                setLoadingEval(false)
            }
        }

        await Promise.all([statsLoad(), evalLoad()])
    }

    const handleSensorChange = (e) => {
        setSelectedSensor(e.target.value)
        setStatistics(null)
        setEvaluation(null)
    }

    const getCorrelationValue = (var1, var2) => {
        if (!statistics) return 0
        if (var1 === var2) return 1
        const c = statistics.correlations
        const key = CORR_KEYS[`${var1}-${var2}`] ?? CORR_KEYS[`${var2}-${var1}`]
        return key ? (c[key] ?? 0) : 0
    }

    const getPredictedData = () => {
        if (!evaluation) return []
        return (evaluation.actualValues ?? []).map((actual, i) => ({
            i,
            Stvarno: Math.round(actual * 10) / 10,
            SSA: evaluation.ssaPredicted?.[i] != null ? Math.round(evaluation.ssaPredicted[i] * 10) / 10 : null,
            'Linear Regression': evaluation.lrPredicted?.[i] != null ? Math.round(evaluation.lrPredicted[i] * 10) / 10 : null,
            FastTree: evaluation.ftPredicted?.[i] != null ? Math.round(evaluation.ftPredicted[i] * 10) / 10 : null,
            'Physical FastTree': evaluation.pftPredicted?.[i] != null ? Math.round(evaluation.pftPredicted[i] * 10) / 10 : null,
        }))
    }

    const modelMetrics = evaluation ? [
        { name: 'SSA', mae: evaluation.ssa?.mae, rmse: evaluation.ssa?.rmse, r2: evaluation.ssa?.r2, color: MODEL_COLORS.SSA },
        { name: 'Linear Regression', mae: evaluation.linearRegression?.mae, rmse: evaluation.linearRegression?.rmse, r2: evaluation.linearRegression?.r2, color: MODEL_COLORS['Linear Regression'] },
        { name: 'FastTree', mae: evaluation.fastTree?.mae, rmse: evaluation.fastTree?.rmse, r2: evaluation.fastTree?.r2, color: MODEL_COLORS.FastTree },
        { name: 'Physical FastTree', mae: evaluation.physicalFastTree?.mae, rmse: evaluation.physicalFastTree?.rmse, r2: evaluation.physicalFastTree?.r2, color: MODEL_COLORS['Physical FastTree'] },
    ] : []

    const isLoading = loadingStats || loadingEval
    const hasData = statistics || evaluation

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Evaluacija modela
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Analiza podataka i usporedba ML modela
                </p>
            </div>

            {/* Controls */}
            <div className="rounded-xl p-4 border mb-6 flex gap-4 flex-wrap items-end"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div>
                    <label htmlFor="sensor-select" className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Senzor</label>
                    <select
                        id="sensor-select"
                        value={selectedSensor}
                        onChange={handleSensorChange}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="days-select" className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Period (dana)</label>
                    <select
                        id="days-select"
                        value={days}
                        onChange={e => setDays(Number.parseInt(e.target.value, 10))}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value={30}>30 dana</option>
                        <option value={60}>60 dana</option>
                        <option value={90}>90 dana</option>
                    </select>
                </div>

                <button
                    onClick={handleLoad}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                    {isLoading ? 'Učitavanje...' : 'Učitaj analizu'}
                </button>
            </div>

            {!hasData && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <i className="fa-solid fa-chart-bar" style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                        Odaberi senzor i pritisni Učitaj analizu
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Evaluacija trenira sve modele na 365 dana podataka — može potrajati 1-2 minute.
                    </p>
                </div>
            )}

            {hasData && (
                <>
                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 flex-wrap">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                style={{
                                    background: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--bg-card)',
                                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)'
                                }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Deskriptivne statistike */}
                    {activeTab === 'stats' && (
                        <div className="space-y-4">
                            {loadingStats ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka...</p>
                            ) : statistics ? (
                                <>
                                    <div className="rounded-xl p-2 border text-xs mb-2"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                                        Podaci: {statistics.dataPoints} satnih mjerenja · {statistics.sensorName} · {new Date(statistics.period.from).toLocaleDateString('hr-HR')} — {new Date(statistics.period.to).toLocaleDateString('hr-HR')}
                                    </div>
                                    {VAR_CONFIGS.map(({ key, label, color }) => {
                                        const s = statistics.statistics?.[key]
                                        if (!s) return null
                                        return (
                                            <div key={key} className="rounded-xl p-4 border"
                                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                                                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</h3>
                                                </div>
                                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                                    <StatCard label="Min" value={s.min} />
                                                    <StatCard label="Q1" value={s.q1} />
                                                    <StatCard label="Medijan" value={s.median} />
                                                    <StatCard label="Mean" value={s.mean} />
                                                    <StatCard label="Q3" value={s.q3} />
                                                    <StatCard label="Max" value={s.max} />
                                                    <StatCard label="Std" value={s.std} />
                                                    <StatCard label="N" value={s.count} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka.</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Distribucije */}
                    {activeTab === 'distribution' && (
                        <div className="space-y-4">
                            {loadingStats ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka...</p>
                            ) : statistics ? (
                                <>
                                    <div className="rounded-xl p-4 border"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                                            Distribucija temperature — histogram
                                        </h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={statistics.temperatureHistogram} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="bin" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                                    tickFormatter={v => `${v}°`} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                                <Tooltip
                                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                                    labelFormatter={v => `${v}°C`}
                                                    formatter={v => [v, 'Broj mjerenja']}
                                                />
                                                <Bar dataKey="count" name="Broj mjerenja" radius={[2, 2, 0, 0]}>
                                                    {statistics.temperatureHistogram.map((entry, i) => (
                                                        <Cell key={`cell-hist-${i}`} fill={getCorrelationColor((entry.bin - 10) / 30)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                                            Distribucija pokazuje raspodjelu temperatura kroz promatrani period.
                                        </p>
                                    </div>

                                    <div className="rounded-xl p-4 border"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                                            Temperatura i vlažnost kroz vrijeme (uzorak)
                                        </h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart
                                                data={statistics.scatterData.map((d, i) => ({ i, temp: d.temperature, humidity: d.humidity }))}
                                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="i" tick={false} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                                                <Line type="monotone" dataKey="temp" stroke="#ff7300" dot={false} strokeWidth={1.5} name="Temperatura (°C)" />
                                                <Line type="monotone" dataKey="humidity" stroke="#0088fe" dot={false} strokeWidth={1.5} name="Vlažnost (%)" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka.</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Korelacijska matrica */}
                    {activeTab === 'correlation' && (
                        <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                            {loadingStats ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka...</p>
                            ) : statistics ? (
                                <>
                                    <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                                        Korelacijska matrica meteoroloških varijabli
                                    </h3>
                                    <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
                                        Pearsonov koeficijent korelacije. Vrijednosti bliže 1 ili -1 ukazuju na jaču linearnu povezanost.
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="mx-auto">
                                            <thead>
                                                <tr>
                                                    <th className="w-24" />
                                                    {VARIABLES.map(v => (
                                                        <th key={v} className="px-2 py-1 text-xs font-medium text-center"
                                                            style={{ color: 'var(--text-secondary)', minWidth: '80px' }}>
                                                            {VAR_LABELS[v]}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {VARIABLES.map(v1 => (
                                                    <tr key={v1}>
                                                        <td className="pr-3 py-1 text-xs font-medium text-right"
                                                            style={{ color: 'var(--text-secondary)' }}>
                                                            {VAR_LABELS[v1]}
                                                        </td>
                                                        {VARIABLES.map(v2 => {
                                                            const val = getCorrelationValue(v1, v2)
                                                            const textColor = Math.abs(val) > 0.4 ? 'white' : 'var(--text-primary)'
                                                            return (
                                                                <td key={v2} className="px-1 py-1">
                                                                    <div className="rounded-lg flex items-center justify-center text-xs font-bold"
                                                                        style={{
                                                                            background: getCorrelationColor(val),
                                                                            color: textColor,
                                                                            width: '72px', height: '40px'
                                                                        }}>
                                                                        {val === 1 ? '1.00' : val.toFixed(2)}
                                                                    </div>
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center gap-4 mt-6 justify-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-4 rounded" style={{ background: 'rgb(239,68,68)' }} />
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Negativna korelacija</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-4 rounded" style={{ background: 'var(--bg-secondary)' }} />
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Nema korelacije</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-4 rounded" style={{ background: 'rgb(239,130,59)' }} />
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pozitivna korelacija</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka.</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Scatter plotovi */}
                    {activeTab === 'scatter' && (
                        <div className="space-y-4">
                            {loadingStats ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Dohvaćanje podataka...</p>
                            ) : statistics ? (
                                <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                    <div className="flex gap-4 mb-4 flex-wrap items-end">
                                        <div>
                                            <label htmlFor="scatter-x" className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>X os</label>
                                            <select
                                                id="scatter-x"
                                                value={scatterX}
                                                onChange={e => setScatterX(e.target.value)}
                                                className="px-3 py-2 rounded-lg text-sm"
                                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                                                {VARIABLES.map(v => <option key={v} value={v}>{VAR_LABELS[v]}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="scatter-y" className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>Y os</label>
                                            <select
                                                id="scatter-y"
                                                value={scatterY}
                                                onChange={e => setScatterY(e.target.value)}
                                                className="px-3 py-2 rounded-lg text-sm"
                                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                                                {VARIABLES.map(v => <option key={v} value={v}>{VAR_LABELS[v]}</option>)}
                                            </select>
                                        </div>
                                        <div className="text-xs px-3 py-2 rounded-lg"
                                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                            r = {getCorrelationValue(scatterX, scatterY).toFixed(3)}
                                        </div>
                                    </div>

                                    <ResponsiveContainer width="100%" height={380}>
                                        <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis
                                                dataKey={scatterX}
                                                name={VAR_LABELS[scatterX]}
                                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                                label={{ value: VAR_LABELS[scatterX], position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)', fontSize: 12 }}
                                            />
                                            <YAxis
                                                dataKey={scatterY}
                                                name={VAR_LABELS[scatterY]}
                                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                                label={{ value: VAR_LABELS[scatterY], angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                                formatter={(value) => [Math.round(value * 10) / 10]}
                                            />
                                            <Scatter data={statistics.scatterData} fill="var(--accent-blue)" fillOpacity={0.5} />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                                        Pearsonov koeficijent korelacije r = {getCorrelationValue(scatterX, scatterY).toFixed(3)}.
                                        Scatter plot prikazuje odnos između odabranih meteoroloških varijabli.
                                    </p>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka.</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Usporedba modela */}
                    {activeTab === 'models' && (
                        <div className="space-y-4">
                            {loadingEval ? (
                                <div className="flex items-center justify-center py-20">
                                    <p style={{ color: 'var(--text-secondary)' }}>Treniranje modela... može potrajati 1-2 minute.</p>
                                </div>
                            ) : evaluation ? (
                                <>
                                    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                            Usporedna tablica modela
                                        </h3>
                                        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                                            80/20 train/test split · Trening: {evaluation.trainSize} mjerenja · Test: {evaluation.testSize} mjerenja
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                        {['Model', 'MAE (°C)', 'RMSE (°C)', 'R²', 'Ocjena'].map(h => (
                                                            <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase"
                                                                style={{ color: 'var(--text-secondary)' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {modelMetrics.map(m => {
                                                        const r2Label = getR2Label(m.r2)
                                                        const r2Color = getR2Color(m.r2)
                                                        const badgeStyle = {
                                                            background: m.r2 > 0.8
                                                                ? 'rgba(16,185,129,0.15)'
                                                                : m.r2 > 0.5
                                                                    ? 'rgba(245,158,11,0.15)'
                                                                    : 'rgba(239,68,68,0.15)',
                                                            color: r2Color
                                                        }
                                                        return (
                                                            <tr key={m.name} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                                                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3" style={{ color: getMetricColor(m.mae, [2, 4]) }}>
                                                                    {m.mae ?? 'N/A'}
                                                                </td>
                                                                <td className="px-4 py-3" style={{ color: getMetricColor(m.rmse, [3, 5]) }}>
                                                                    {m.rmse ?? 'N/A'}
                                                                </td>
                                                                <td className="px-4 py-3" style={{ color: r2Color }}>
                                                                    {m.r2 ?? 'N/A'}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-xs px-2 py-1 rounded-full" style={badgeStyle}>
                                                                        {r2Label}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                                            MAE po modelu (niže = bolje)
                                        </h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={modelMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                                    label={{ value: '°C', position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                                <Bar dataKey="mae" name="MAE (°C)" radius={[4, 4, 0, 0]}>
                                                    {modelMetrics.map((m, i) => <Cell key={`mae-${i}`} fill={m.color} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
                                            R² po modelu (više = bolje)
                                        </h3>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={modelMetrics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} domain={[0, 1]} />
                                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                                <Bar dataKey="r2" name="R²" radius={[4, 4, 0, 0]}>
                                                    {modelMetrics.map((m, i) => <Cell key={`r2-${i}`} fill={m.color} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka evaluacije.</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Predviđeno vs stvarno */}
                    {activeTab === 'predicted' && (
                        <div className="space-y-4">
                            {loadingEval ? (
                                <div className="flex items-center justify-center py-20">
                                    <p style={{ color: 'var(--text-secondary)' }}>Treniranje modela...</p>
                                </div>
                            ) : evaluation ? (
                                <>
                                    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                        <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                            Predviđene vs stvarne temperature — test skup
                                        </h3>
                                        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                                            Prikazano prvih 200 točaka test skupa. Zelena linija = stvarne vrijednosti.
                                        </p>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <LineChart data={getPredictedData()} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="i" tick={false}
                                                    label={{ value: 'Mjerenja (test skup)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                                    label={{ value: '°C', position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                                                <Line type="monotone" dataKey="Stvarno" stroke="#00c49f" strokeWidth={3} dot={false} />
                                                <Line type="monotone" dataKey="SSA" stroke="#ff7300" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
                                                <Line type="monotone" dataKey="Linear Regression" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
                                                <Line type="monotone" dataKey="FastTree" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="8 2" />
                                                <Line type="monotone" dataKey="Physical FastTree" stroke="#ec4899" strokeWidth={2.5} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { key: 'SSA', dataKey: 'SSA' },
                                            { key: 'Linear Regression', dataKey: 'Linear Regression' },
                                            { key: 'FastTree', dataKey: 'FastTree' },
                                            { key: 'Physical FastTree', dataKey: 'Physical FastTree' },
                                        ].map(({ key, dataKey }) => {
                                            const scData = getPredictedData()
                                                .filter(d => d[dataKey] !== null)
                                                .map(d => ({ actual: d.Stvarno, predicted: d[dataKey] }))
                                            return (
                                                <div key={key} className="rounded-xl p-4 border"
                                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-3 h-3 rounded-full" style={{ background: MODEL_COLORS[key] }} />
                                                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                            {key} — Stvarno vs Predviđeno
                                                        </h3>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height={220}>
                                                        <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                            <XAxis dataKey="actual" name="Stvarno" type="number"
                                                                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                                                label={{ value: 'Stvarno (°C)', position: 'insideBottom', offset: -12, fill: 'var(--text-secondary)', fontSize: 10 }} />
                                                            <YAxis dataKey="predicted" name="Predviđeno" type="number"
                                                                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                                                label={{ value: 'Predviđeno (°C)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 10 }} />
                                                            <Tooltip
                                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                                                formatter={v => [`${Math.round(v * 10) / 10}°C`]}
                                                            />
                                                            <Scatter data={scData} fill={MODEL_COLORS[key]} fillOpacity={0.6} />
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                    <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
                                                        Idealan model = dijagonalna linija
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)' }}>Nema podataka evaluacije.</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default Evaluation