import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { sensorService, measurementService } from '../services/api'
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

function MapView() {
    const [sensors, setSensors] = useState([])
    const [measurements, setMeasurements] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await sensorService.getActive()
                setSensors(res.data)

                const m = {}
                for (const sensor of res.data) {
                    try {
                        const mRes = await measurementService.getLatest(sensor.id)
                        m[sensor.id] = mRes.data
                    } catch {
                        m[sensor.id] = null
                    }
                }
                setMeasurements(m)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return <p style={{ padding: '20px' }}>Učitavanje karte...</p>

    const defaultCenter = sensors.length > 0
        ? [sensors[0].latitude, sensors[0].longitude]
        : [46.3044, 16.3378]

    return (
        <div style={{ padding: '20px' }}>
            <h1>Karta senzora</h1>
            <p style={{ color: '#666', marginBottom: '16px' }}>
                Aktivni senzori: {sensors.length} — boja markera prikazuje trenutnu temperaturu
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[
                    { label: '< 0°C', color: '#0000ff' },
                    { label: '0–10°C', color: '#00aaff' },
                    { label: '10–20°C', color: '#00cc44' },
                    { label: '20–30°C', color: '#ffaa00' },
                    { label: '> 30°C', color: '#ff0000' },
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.color }} />
                        <span style={{ fontSize: '13px' }}>{item.label}</span>
                    </div>
                ))}
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: '500px', borderRadius: '8px' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                {sensors.map(sensor => {
                    const m = measurements[sensor.id]
                    const temp = m?.temperature ?? null
                    const color = getTemperatureColor(temp)
                    const icon = createColoredIcon(color)

                    return (
                        <Marker
                            key={sensor.id}
                            position={[sensor.latitude, sensor.longitude]}
                            icon={icon}
                        >
                            <Popup>
                                <strong>{sensor.name}</strong><br />
                                {sensor.location}<br />
                                {m ? (
                                    <>
                                        🌡️ {m.temperature}°C<br />
                                        💧 {m.humidity}%<br />
                                        🌬️ {m.pressure} hPa<br />
                                        💨 {m.windSpeed} km/h<br />
                                        <small style={{ color: '#999' }}>
                                            {new Date(m.timestamp).toLocaleString('hr-HR')}
                                        </small>
                                    </>
                                ) : <span>Nema podataka</span>}
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}

export default MapView