import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { weatherService } from '../services/api'
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
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await weatherService.getCurrentAll()
                setSensorData(res.data)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Učitavanje karte...</p>
        </div>
    )

    const defaultCenter = sensorData.length > 0
        ? [sensorData[0].latitude, sensorData[0].longitude]
        : [44.0, 19.0]

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Karta senzora
            </h1>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Aktivni senzori: {sensorData.length} — boja markera prikazuje trenutnu temperaturu
            </p>

            <div className="flex gap-4 mb-4 flex-wrap">
                {[
                    { label: '< 0°C', color: '#0000ff' },
                    { label: '0–10°C', color: '#00aaff' },
                    { label: '10–20°C', color: '#00cc44' },
                    { label: '20–30°C', color: '#ffaa00' },
                    { label: '> 30°C', color: '#ff0000' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.color }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <MapContainer
                    center={defaultCenter}
                    zoom={5}
                    style={{ height: '600px' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    {sensorData.map(item => {
                        const temp = item.weather?.temperature ?? null
                        const color = getTemperatureColor(temp)
                        const icon = createColoredIcon(color)

                        return (
                            <Marker
                                key={item.sensorId}
                                position={[item.latitude, item.longitude]}
                                icon={icon}
                            >
                                <Popup>
                                    <strong>{item.sensorName}</strong><br />
                                    {item.location}<br />
                                    {item.weather ? (
                                        <>
                                            🌡️ {item.weather.temperature}°C<br />
                                            💧 {item.weather.humidity}%<br />
                                            🌬️ {item.weather.pressure} hPa<br />
                                            💨 {item.weather.windSpeed} km/h<br />
                                            🌧️ {item.weather.precipitation} mm
                                        </>
                                    ) : <span>Nema podataka</span>}
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