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
        </nav>
    );
};

export default NavBar;
