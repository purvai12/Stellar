import React from 'react';
import { NavLink } from 'react-router-dom';

const NavBar = () => {
    return (
        <nav className="navbar">
            <NavLink to="/wallet" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                💼 Wallet
            </NavLink>
            <NavLink to="/send" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                💸 Send
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                📜 History
            </NavLink>
            <NavLink to="/onchain" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
                ⛓️ Chain
            </NavLink>
        </nav>
    );
};

export default NavBar;
