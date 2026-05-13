import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
    { to: '/', label: 'Dashboard', icon: '⬡' },
    { to: '/weather-map', label: 'Vremenska karta', icon: '🌍' },
    { to: '/sensors', label: 'Senzori', icon: '📡' },
    { to: '/history', label: 'Povijest', icon: '📈' },
    { to: '/predictions', label: 'Predikcije', icon: '🔮' },
    { to: '/evaluation', label: 'Evaluacija', icon: '📊' },
    { to: '/alerts', label: 'Alarmi', icon: '🔔' },
]

function Layout() {
    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 flex flex-col border-r"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>

                {/* Logo */}
                <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: 'var(--accent-blue)' }}>
                            W
                        </div>
                        <div>
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                WeatherIS
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Informacijski sustav
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                                    ? 'font-medium'
                                    : 'hover:opacity-80'
                                }`
                            }
                            style={({ isActive }) => ({
                                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                            })}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        IoT • ML.NET • ASP.NET Core
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    )
}

export default Layout