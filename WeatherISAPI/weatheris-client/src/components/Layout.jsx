import { Outlet, Link } from 'react-router-dom'

function Layout() {
    return (
        <div>
            <nav>
                <Link to="/">Dashboard</Link> |{' '}
                <Link to="/sensors">Senzori</Link> |{' '}
                <Link to="/map">Karta</Link> |{' '}
                <Link to="/history">Povijest</Link> |{' '}
                <Link to="/predictions">Predikcije</Link> |{' '}
                <Link to="/alerts">Alarmi</Link>
            </nav>
            <Outlet />
        </div>
    )
}

export default Layout