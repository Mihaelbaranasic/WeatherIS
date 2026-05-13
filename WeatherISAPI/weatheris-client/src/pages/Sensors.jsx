import { useState, useEffect } from 'react'
import { sensorService } from '../services/api'

function Sensors() {
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', location: '', latitude: '', longitude: '', isActive: true
  })

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await sensorService.getAll()
        setSensors(res.data)
      } catch (err) {
        console.error('Greška:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSensors()
  }, [])

  const handleSubmit = async () => {
    try {
      await sensorService.create({
        ...form,
        id: 0,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        createdAt: new Date().toISOString(),
        measurements: []
      })
      const res = await sensorService.getAll()
      setSensors(res.data)
      setShowForm(false)
      setForm({ name: '', location: '', latitude: '', longitude: '', isActive: true })
    } catch (err) {
      console.error('Greška pri kreiranju:', err)
    }
  }

  const handleToggle = async (id) => {
    try {
      await sensorService.toggle(id)
      const res = await sensorService.getAll()
      setSensors(res.data)
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Obrisati senzor?')) return
    try {
      await sensorService.delete(id)
      setSensors(sensors.filter(s => s.id !== id))
    } catch (err) {
      console.error('Greška:', err)
    }
  }

  if (loading) return <p>Učitavanje...</p>

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Senzori</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Odustani' : '+ Dodaj senzor'}
        </button>
      </div>

      {showForm && (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
          <h3>Novi senzor</h3>
          {['name', 'location', 'latitude', 'longitude'].map(field => (
            <div key={field} style={{ marginBottom: '8px' }}>
              <label>{field}: </label>
              <input
                value={form[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                style={{ marginLeft: '8px' }}
              />
            </div>
          ))}
          <button onClick={handleSubmit}>Spremi</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Naziv</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Lokacija</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Lat/Lng</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {sensors.map(sensor => (
            <tr key={sensor.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{sensor.id}</td>
              <td style={{ padding: '8px' }}>{sensor.name}</td>
              <td style={{ padding: '8px' }}>{sensor.location}</td>
              <td style={{ padding: '8px' }}>{sensor.latitude}, {sensor.longitude}</td>
              <td style={{ padding: '8px' }}>
                <span style={{ color: sensor.isActive ? 'green' : 'red' }}>
                  {sensor.isActive ? 'Aktivan' : 'Neaktivan'}
                </span>
              </td>
              <td style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={() => handleToggle(sensor.id)}>
                  {sensor.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
                </button>
                <button onClick={() => handleDelete(sensor.id)} style={{ color: 'red' }}>
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Sensors