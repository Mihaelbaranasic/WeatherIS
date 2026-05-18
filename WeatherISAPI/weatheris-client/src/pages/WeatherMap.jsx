import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { weatherService } from '../services/api'
import * as signalR from '@microsoft/signalr'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function getTemperatureColor(temp) {
    if (temp === null || temp === undefined) return '#999'
    if (temp < 0) return '#0000ff'
    if (temp < 10) return '#00aaff'
    if (temp < 20) return '#00cc44'
    if (temp < 30) return '#ffaa00'
    return '#ff0000'
}

function createColoredIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 20px; height: 20px;
            background: ${color};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12]
    })
}

function MapBounds({ sensors }) {
    const map = useMap()
    useEffect(() => {
        if (sensors.length > 0) {
            const bounds = sensors.map(s => [s.latitude, s.longitude])
            map.fitBounds(bounds, { padding: [30, 30] })
        }
    }, [sensors, map])
    return null
}

function MapView() {
    const [mode, setMode] = useState('simulator')
    const [sensorData, setSensorData] = useState([])
    const [simulatorData, setSimulatorData] = useState({})
    const [loading, setLoading] = useState(true)
    const [connected, setConnected] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)
    const connectionRef = useRef(null)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
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
        load()

        const connection = new signalR.HubConnectionBuilder()
            .withUrl('https://localhost:7068/hubs/sensor')
            .withAutomaticReconnect()
            .build()

        connection.on('ReceiveLatestMeasurement', (data) => {
            setSimulatorData(prev => ({
                ...prev,
                [data.sensorId]: data
            }))
            setLastUpdate(new Date())
        })

        const startConn = async () => {
            try {
                await connection.start()
                setConnected(true)
            } catch (err) {
                console.error('SignalR greška:', err)
            }
        }

        startConn()
        connectionRef.current = connection

        return () => {
            connection.stop()
        }
    }, [])

    const handleModeChange = async (newMode) => {
        setMode(newMode)
        if (newMode === 'openmeteo') {
            setLoading(true)
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
    }

    const displayData = mode === 'simulator'
        ? sensorData.map(item => ({
            ...item,
            weather: simulatorData[item.sensorId] ?? item.weather
        }))
        : sensorData

    if (loading && sensorData.length === 0) return (
        <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Učitavanje karte...</p>
        </div>
    )

    return (
        <div className="p-6">
            {console.log('MapView render, mode:', mode, 'sensorData:', sensorData.length)}
            <div className="mb-4">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Karta senzora
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {displayData.length} aktivnih senzora
                    {lastUpdate && ` · Ažurirano ${lastUpdate.toLocaleTimeString('hr-HR')}`}
                </p>
            </div>

            {/* Kontrole iznad karte */}
            <div className="rounded-xl p-4 border mb-4 flex items-center justify-between flex-wrap gap-4"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                        style={{
                            background: connected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: connected ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                        <div className="w-2 h-2 rounded-full"
                            style={{ background: connected ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                        {connected ? 'SignalR Live' : 'Nepovezan'}
                    </div>

                    <select
                        value={mode}
                        onChange={e => handleModeChange(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            outline: 'none'
                        }}>
                        <option value="simulator">🤖 IoT Simulator</option>
                        <option value="openmeteo">🌍 Open-Meteo stvarni</option>
                    </select>
                </div>

                {/* Legenda */}
                <div className="flex gap-3 flex-wrap">
                    {[
                        { label: '< 0°C', color: '#0000ff' },
                        { label: '0–10°C', color: '#00aaff' },
                        { label: '10–20°C', color: '#00cc44' },
                        { label: '20–30°C', color: '#ffaa00' },
                        { label: '> 30°C', color: '#ff0000' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info banner */}
            <div className="rounded-lg px-4 py-2 mb-4 text-xs"
                style={{
                    background: mode === 'simulator' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                    color: mode === 'simulator' ? 'var(--accent-blue)' : 'var(--accent-green)',
                    border: `1px solid ${mode === 'simulator' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`
                }}>
                {mode === 'simulator'
                    ? '🤖 IoT Simulator — podaci se generiraju i šalju putem SignalR svakih 10 sekundi'
                    : '🌍 Open-Meteo API — stvarni meteorološki podaci za odabrane lokacije'}
            </div>

            {/* Karta */}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <MapContainer
                    center={[44.0, 19.0]}
                    zoom={5}
                    style={{ height: '600px' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    <MapBounds sensors={displayData.map(d => ({ latitude: d.latitude, longitude: d.longitude }))} />
                    {displayData.map(item => {
                        const temp = item.weather?.temperature ?? null
                        const isSimulated = mode === 'simulator' && simulatorData[item.sensorId] != null
                        const color = isSimulated ? 'var(--accent-blue)' : getTemperatureColor(temp)
                        const icon = createColoredIcon(color)

                        return (
                            <Marker
                                key={item.sensorId}
                                position={[item.latitude, item.longitude]}
                                icon={icon}
                            >
                                <Popup>
                                    <div style={{ minWidth: '160px' }}>
                                        <strong>{item.sensorName}</strong>
                                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                                            {item.location}
                                        </div>
                                        {item.weather ? (
                                            <>
                                                <div>🌡️ <strong>{item.weather.temperature}°C</strong></div>
                                                <div>💧 {item.weather.humidity}%</div>
                                                <div>🌬️ {item.weather.pressure} hPa</div>
                                                <div>💨 {item.weather.windSpeed} km/h</div>
                                                <div>🌧️ {item.weather.precipitation} mm</div>
                                                {isSimulated && (
                                                    <div style={{ marginTop: '4px', fontSize: '10px', color: '#3b82f6' }}>
                                                        ⚡ IoT Simulator — live
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span>Nema podataka</span>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>
        </div>
    )
}

export default MapView