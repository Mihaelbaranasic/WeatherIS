import { useState, useEffect } from 'react'
import { alertService } from '../services/api'

const ITEMS_PER_PAGE = 10

const paramLabels = {
    Temperature: 'Temperatura',
    WindSpeed: 'Brzina vjetra',
    Precipitation: 'Oborine'
}

const paramIcons = {
    Temperature: '🌡️',
    WindSpeed: '💨',
    Precipitation: '🌧️'
}

function Pagination({ page, totalPages, onPageChange }) {
    const getPages = () => {
        const pages = []
        const delta = 2
        const left = Math.max(1, page - delta)
        const right = Math.min(totalPages, page + delta)

        if (left > 1) {
            pages.push(1)
            if (left > 2) pages.push('...')
        }

        for (let i = left; i <= right; i++) pages.push(i)

        if (right < totalPages) {
            if (right < totalPages - 1) pages.push('...')
            pages.push(totalPages)
        }

        return pages
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                ←
            </button>

            {getPages().map((p, i) =>
                p === '...' ? (
                    <span key={`dots-${i}`} className="px-2" style={{ color: 'var(--text-secondary)' }}>...</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80"
                        style={{
                            background: p === page ? 'var(--accent-blue)' : 'var(--bg-card)',
                            color: p === page ? 'white' : 'var(--text-primary)',
                            border: '1px solid var(--border)'
                        }}>
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                →
            </button>
        </div>
    )
}

function Alerts() {
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await alertService.getAllActive()
                setAlerts(res.data)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchAlerts()
    }, [])

    const handleResolve = async (id) => {
        try {
            await alertService.resolve(id)
            setAlerts(prev => prev.filter(a => a.id !== id))
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const handleResolveAll = async () => {
        if (!window.confirm('Razriješiti sve aktivne alarme?')) return
        try {
            await Promise.all(alerts.map(a => alertService.resolve(a.id)))
            setAlerts([])
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const filtered = alerts.filter(a =>
        (paramLabels[a.parameter] || a.parameter)
            .toLowerCase()
            .includes(search.toLowerCase())
    )

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Učitavanje alarma...</p>
        </div>
    )

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        Aktivni alarmi
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Ukupno: {alerts.length} aktivnih alarma
                    </p>
                </div>
                {alerts.length > 0 && (
                    <button
                        onClick={handleResolveAll}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        Razriješi sve
                    </button>
                )}
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Pretraži po parametru..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    className="px-4 py-2 rounded-lg text-sm w-full max-w-xs"
                    style={{
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        outline: 'none'
                    }}
                />
            </div>

            {paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                        Nema aktivnih alarma
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Sustav radi unutar normalnih parametara.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {paginated.map(alert => (
                        <div key={alert.id}
                            className="rounded-xl p-4 border flex items-center justify-between gap-4"
                            style={{
                                background: 'var(--bg-card)',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                borderLeft: '4px solid var(--accent-red)'
                            }}>

                            <div className="flex items-center gap-4">
                                <div className="text-2xl">
                                    {paramIcons[alert.parameter] || '⚠️'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {paramLabels[alert.parameter] || alert.parameter}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}>
                                            ● Aktivan
                                        </span>
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Senzor ID: <span style={{ color: 'var(--text-primary)' }}>{alert.sensorId}</span>
                                        <span className="mx-2">·</span>
                                        Izmjereno: <span style={{ color: 'var(--accent-red)' }}><strong>{alert.measuredValue}</strong></span>
                                        <span className="mx-2">·</span>
                                        Prag: <span style={{ color: 'var(--text-primary)' }}><strong>{alert.thresholdValue}</strong></span>
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        {new Date(alert.triggeredAt).toLocaleString('hr-HR')}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleResolve(alert.id)}
                                className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 hover:opacity-80 transition-opacity"
                                style={{ background: 'var(--accent-red)', color: 'white' }}>
                                Razriješi
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}

export default Alerts