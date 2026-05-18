import { useState, useEffect } from 'react'
import { alertService, subscriptionService, sensorService } from '../services/api'

const ITEMS_PER_PAGE = 10

const paramLabels = {
    Temperature: 'Temperatura',
    WindSpeed: 'Brzina vjetra',
    Precipitation: 'Oborine',
    Pressure: 'Tlak',
    Humidity: 'Vlažnost'
}

const paramIcons = {
    Temperature: 'fa-solid fa-temperature-half',
    WindSpeed: 'fa-solid fa-wind',
    Precipitation: 'fa-solid fa-cloud-rain',
    Pressure: 'fa-solid fa-gauge',
    Humidity: 'fa-solid fa-droplet'
}

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
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                ←
            </button>
            {getPages().map((p, i) => p === '...'
                ? <span key={`d${i}`} className="px-2" style={{ color: 'var(--text-secondary)' }}>...</span>
                : <button key={p} onClick={() => onPageChange(p)}
                    className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80"
                    style={{
                        background: p === page ? 'var(--accent-blue)' : 'var(--bg-card)',
                        color: p === page ? 'white' : 'var(--text-primary)',
                        border: '1px solid var(--border)'
                    }}>{p}</button>
            )}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                →
            </button>
        </div>
    )
}

function Alerts() {
    const [alerts, setAlerts] = useState([])
    const [sensors, setSensors] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')

    // Modal
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [selectedSensorId, setSelectedSensorId] = useState(null)
    const [subscriptions, setSubscriptions] = useState([])

    // Pretplata
    const [email, setEmail] = useState('')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subMessage, setSubMessage] = useState('')
    const [subLoading, setSubLoading] = useState(false)
    const [emailError, setEmailError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const [alertsRes, sensorsRes] = await Promise.all([
                    alertService.getAllActive(),
                    sensorService.getAll()
                ])
                setAlerts(alertsRes.data)
                setSensors(sensorsRes.data)
            } catch (err) {
                console.error('Greška:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

    const loadSubscriptions = async () => {
        if (!email || !validateEmail(email)) {
            setEmailError('Unesite ispravnu email adresu.')
            return
        }
        setEmailError('')
        try {
            const res = await subscriptionService.getList(email)
            setSubscriptions(res.data)
        } catch (err) {
            console.error('Greška:', err)
        }
    }

    const handleSubscribe = async () => {
        if (!validateEmail(email)) { setEmailError('Unesite ispravnu email adresu.'); return }
        setEmailError('')
        setSubLoading(true)
        try {
            const res = await subscriptionService.subscribe(email, selectedSensorId)
            setSubMessage(res.data.message)
            setIsSubscribed(res.data.isActive)
            await loadSubscriptions()
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setSubLoading(false)
        }
    }

    const handleUnsubscribe = async () => {
        if (!validateEmail(email)) { setEmailError('Unesite ispravnu email adresu.'); return }
        setEmailError('')
        setSubLoading(true)
        try {
            const res = await subscriptionService.unsubscribe(email, selectedSensorId)
            setSubMessage(res.data.message)
            setIsSubscribed(res.data.isActive)
            await loadSubscriptions()
        } catch (err) {
            console.error('Greška:', err)
        } finally {
            setSubLoading(false)
        }
    }

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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSubscribeModal(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--accent-blue)', color: 'white' }}>
                        <i className="fa-solid fa-bell mr-2" />
                        Email obavijesti
                    </button>
                    {alerts.length > 0 && (
                        <button
                            onClick={handleResolveAll}
                            className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                            style={{
                                background: 'rgba(239,68,68,0.15)',
                                color: 'var(--accent-red)',
                                border: '1px solid rgba(239,68,68,0.3)'
                            }}>
                            Razriješi sve
                        </button>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showSubscribeModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowSubscribeModal(false) }}>
                    <div className="rounded-xl p-6 border w-full max-w-md mx-4"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                <i className="fa-solid fa-bell mr-2" style={{ color: 'var(--accent-blue)' }} />
                                Email obavijesti
                            </h3>
                            <button onClick={() => setShowSubscribeModal(false)}
                                className="hover:opacity-60 transition-opacity"
                                style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Pretplatite se na email obavijesti kada se okine meteorološki alarm za odabrani senzor.
                        </p>

                        {/* Email */}
                        <div className="mb-4">
                            <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                Email adresa
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="vasa@email.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setSubMessage(''); setEmailError('') }}
                                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: `1px solid ${emailError ? 'var(--accent-red)' : 'var(--border)'}`,
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={loadSubscriptions}
                                    className="px-3 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                                    Provjeri
                                </button>
                            </div>
                            {emailError && (
                                <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>{emailError}</p>
                            )}
                        </div>

                        {/* Senzor */}
                        <div className="mb-4">
                            <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                                Senzor
                            </label>
                            <select
                                value={selectedSensorId ?? ''}
                                onChange={e => setSelectedSensorId(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}>
                                <option value="">Svi senzori</option>
                                {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Akcije */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={handleSubscribe}
                                disabled={subLoading || !email}
                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                                style={{ background: 'var(--accent-blue)', color: 'white' }}>
                                <i className="fa-solid fa-bell mr-2" />
                                Pretplati se
                            </button>
                            <button
                                onClick={handleUnsubscribe}
                                disabled={subLoading || !email}
                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                                style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <i className="fa-solid fa-bell-slash mr-2" />
                                Odjavi se
                            </button>
                        </div>

                        {/* Poruka */}
                        {subMessage && (
                            <div className="text-xs px-3 py-2 rounded-lg mb-4"
                                style={{
                                    background: isSubscribed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: isSubscribed ? 'var(--accent-green)' : 'var(--accent-orange)',
                                    border: `1px solid ${isSubscribed ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                                }}>
                                <i className={`fa-solid ${isSubscribed ? 'fa-circle-check' : 'fa-circle-info'} mr-2`} />
                                {subMessage}
                            </div>
                        )}

                        {/* Lista pretplata */}
                        {subscriptions.length > 0 && (
                            <div>
                                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    Aktivne pretplate za {email}:
                                </p>
                                <div className="flex flex-col gap-2">
                                    {subscriptions.map(sub => (
                                        <div key={sub.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                                            style={{ background: 'var(--bg-secondary)' }}>
                                            <span style={{ color: 'var(--text-primary)' }}>
                                                <i className="fa-solid fa-satellite-dish mr-2" style={{ color: 'var(--accent-blue)' }} />
                                                {sub.sensorName}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>
                                                Aktivna
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Pretraživanje */}
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
                    <i className="fa-solid fa-circle-check mb-4"
                        style={{ fontSize: '48px', color: 'var(--accent-green)' }} />
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
                                borderColor: 'rgba(239,68,68,0.4)',
                                borderLeft: '4px solid var(--accent-red)'
                            }}>
                            <div className="flex items-center gap-4">
                                <i
                                    className={paramIcons[alert.parameter] || 'fa-solid fa-triangle-exclamation'}
                                    style={{ fontSize: '20px', color: 'var(--accent-red)', width: '24px', textAlign: 'center' }}
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {paramLabels[alert.parameter] || alert.parameter}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
                                            Aktivan
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
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
        </div>
    )
}

export default Alerts