import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const links = [
    { to: '/dashboard', icon: '▦', label: 'Dashboard' },
    { to: '/goals', icon: '◎', label: 'Goals' },
    { to: '/community', icon: '⊞', label: 'Community' },
    { to: '/send', icon: '↗', label: 'Send XLM' },
    { to: '/history', icon: '≡', label: 'History' },
    { to: '/onchain', icon: '⬡', label: 'On-Chain' },
];

export default function Sidebar({ walletAddress, disconnectWallet }) {
    const navigate = useNavigate();
    const short = walletAddress
        ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
        : '';

    const handleDisconnect = () => {
        disconnectWallet();
        navigate('/');
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, width: '100%' }}>
                <span className="sidebar-logo">✦</span>
                <span className="sidebar-logo-text">StellaSmart Saver</span>
            </div>

            {/* Profile Section */}
            {walletAddress && (
                <div className="sidebar-profile animate-in">
                    <div className="profile-avatar">
                        {walletAddress.slice(1, 2).toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <div className="profile-name">Saver</div>
                        <div className="profile-addr">{short}</div>
                    </div>
                </div>
            )}

            {/* Nav Links */}
            {links.map(({ to, icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                    <span className="nav-icon">{icon}</span>
                    <span className="nav-label">{label}</span>
                </NavLink>
            ))}

            {/* Bottom: disconnect */}
            <div className="sidebar-bottom">
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button
                        className="nav-link"
                        style={{ color: 'var(--danger)', width: '100%' }}
                        onClick={handleDisconnect}
                    >
                        <span className="nav-icon">⏻</span>
                        <span className="nav-label">Disconnect</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
