import { useState, useEffect } from 'react'
import { sensorService } from '../services/api'

const ITEMS_PER_PAGE = 10

function Pagination({ page, totalPages, onPageChange }) {
    const getPages = () => {
        const pages = []
        const delta = 2
        const left = Math.max(1, page - delta)
        const right = Math.min(totalPages, page + delta)
        if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
        for (let i = left; i <= right; i++) pages.push(i)
        if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages) }
        return pages
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>←</button>
            {getPages().map((p, i) => p === '...'
                ? <span key={`d${i}`} className="px-2" style={{ color: 'var(--text-secondary)' }}>...</span>
                : <button key={p} onClick={() => onPageChange(p)}
                    className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80"
                    style={{ background: p === page ? 'var(--accent-blue)' : 'var(--bg-card)', color: p === page ? 'white' : 'var(--text-primary)', border: '1px solid var(--border)' }}>{p}</button>
            )}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>→</button>
        </div>
    )
}

function Sensors() {
    const [sensors, setSensors] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [form, setForm] = useState({
        name: '', location: '', latitude: '', longitude: '', isActive: true
    })


    const fetchSensors = async () => {
        try {
            const res = await sensorService.getAll()
            setSensors(res.data)
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    useEffect(() => {
        const load = async () => {
            try {
                const res = await sensorService.getAll()
                setSensors(res.data)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleSubmit = async () => {
        if (!form.name || !form.latitude || !form.longitude) return
        try {
            await sensorService.create({
                ...form,
                id: 0,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                createdAt: new Date().toISOString()
            })
            await fetchSensors()
            setShowForm(false)
            setForm({ name: '', location: '', latitude: '', longitude: '', isActive: true })
        } catch (err) {
            console.error('Greška pri kreiranju:', err)
        }
    }

    const handleToggle = async (id) => {
        try {
            await sensorService.toggle(id)
            await fetchSensors()
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Obrisati senzor?')) return
        try {
            await sensorService.delete(id)
            setSensors(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const filtered = sensors.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.location.toLowerCase().includes(search.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Učitavanje senzora...</p>
        </div>
    )

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Senzori</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ukupno: {sensors.length} senzora</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--accent-blue)', color: 'white' }}>
                    {showForm ? 'Odustani' : '+ Dodaj senzor'}
                </button>
            </div>

            {showForm && (
                <div className="rounded-xl p-5 border mb-6"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Novi senzor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {[
                            { key: 'name', label: 'Naziv' },
                            { key: 'location', label: 'Lokacija' },
                            { key: 'latitude', label: 'Latitude' },
                            { key: 'longitude', label: 'Longitude' }
                        ].map(({ key, label }) => (
                            <div key={key}>
                                <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                                <input
                                    value={form[key]}
                                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--accent-green)', color: 'white' }}>
                        Spremi
                    </button>
                </div>
            )}

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Pretraži po nazivu ili lokaciji..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    className="px-4 py-2 rounded-lg text-sm w-full max-w-xs"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
                />
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full">
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                            {['ID', 'Naziv', 'Lokacija', 'Koordinate', 'Status', 'Akcije'].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                                    style={{ color: 'var(--text-secondary)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((sensor, idx) => (
                            <tr key={sensor.id}
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                    background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)'
                                }}>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{sensor.id}</td>
                                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sensor.name}</td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{sensor.location}</td>
                                <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    {sensor.latitude.toFixed(4)}, {sensor.longitude.toFixed(4)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs px-2 py-1 rounded-full"
                                        style={{
                                            background: sensor.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: sensor.isActive ? 'var(--accent-green)' : 'var(--accent-red)'
                                        }}>
                                        ● {sensor.isActive ? 'Aktivan' : 'Neaktivan'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggle(sensor.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                                            style={{
                                                background: sensor.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: sensor.isActive ? 'var(--accent-red)' : 'var(--accent-green)',
                                                border: `1px solid ${sensor.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                                            }}>
                                            {sensor.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sensor.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                            Obriši
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
        </div>
    )
}

export default Sensors