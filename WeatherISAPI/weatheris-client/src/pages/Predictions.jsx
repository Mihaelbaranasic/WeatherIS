import { useState, useEffect } from 'react'
import { sensorService, predictionService } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

function Predictions() {
    const [sensors, setSensors] = useState([])
    const [selectedSensor, setSelectedSensor] = useState('')
    const [predictions, setPredictions] = useState([])
    const [evaluation, setEvaluation] = useState(null)
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [horizon, setHorizon] = useState(24)

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

    const loadPredictions = async (sensorId) => {
        setLoading(true)
        try {
            const res = await predictionService.getBySensor(sensorId)
            const formatted = res.data
                .slice()
                .reverse()
                .map(p => ({
                    time: new Date(p.predictedFor).toLocaleString('hr-HR'),
                    temperatura: Math.round(p.predictedTemperature * 10) / 10,
                    id: p.id
                }))
            setPredictions(formatted)
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedSensor) return
        setGenerating(true)
        try {
            await predictionService.generate(selectedSensor, horizon)
            await loadPredictions(selectedSensor)
        } catch (err) {
            console.error('Greška pri generiranju:', err)
        } finally {
            setGenerating(false)
        }
    }

    const handleEvaluate = async () => {
        if (!selectedSensor) return
        try {
            const res = await predictionService.evaluate(selectedSensor)
            setEvaluation(res.data)
        } catch (err) {
            console.error('Greška pri evaluaciji:', err)
        }
    }

    const handleSensorChange = (e) => {
        setSelectedSensor(e.target.value)
        setPredictions([])
        setEvaluation(null)
        loadPredictions(e.target.value)
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Predikcije</h1>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <label>Senzor: </label>
                    <select value={selectedSensor} onChange={handleSensorChange}>
                        {sensors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Horizont (sati): </label>
                    <input
                        type="number"
                        min="1"
                        max="72"
                        value={horizon}
                        onChange={e => setHorizon(parseInt(e.target.value))}
                        style={{ width: '60px', marginLeft: '8px' }}
                    />
                </div>

                <button onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Generiranje...' : 'Generiraj predikcije'}
                </button>

                <button onClick={handleEvaluate}>
                    Evaluiraj model
                </button>
            </div>

            {evaluation && (
                <div style={{
                    display: 'flex', gap: '16px', flexWrap: 'wrap',
                    marginBottom: '16px', padding: '16px',
                    border: '1px solid #ccc', borderRadius: '8px'
                }}>
                    <h3 style={{ width: '100%', margin: '0 0 8px 0' }}>Evaluacija modela</h3>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{evaluation.mae}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>MAE (°C)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{evaluation.rmse}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>RMSE (°C)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{evaluation.r2}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>R²</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{evaluation.trainSize}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Trening skup</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{evaluation.testSize}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>Test skup</div>
                    </div>
                </div>
            )}

            {loading && <p>Učitavanje...</p>}

            {!loading && predictions.length === 0 && (
                <p style={{ color: '#999' }}>Nema predikcija. Generiraj ih klikom na gumb.</p>
            )}

            {!loading && predictions.length > 0 && (
                <>
                    <p>Prikazano predikcija: {predictions.length}</p>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={predictions}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <ReferenceLine
                                x={predictions[0]?.time}
                                stroke="#999"
                                strokeDasharray="4 4"
                                label={{ value: 'sada', position: 'top', fontSize: 11 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="temperatura"
                                stroke="#ff7300"
                                dot={false}
                                name="Predviđena temperatura (°C)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            )}
        </div>
    )
}

export default Predictions