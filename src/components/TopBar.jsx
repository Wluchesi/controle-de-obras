import React from 'react'
import { Menu, Building2 } from 'lucide-react'
import './TopBar.css'

export const TopBar = ({ onMenuToggle }) => {
    return (
        <header className="top-bar glass">
            <div className="top-bar-logo">
                <Building2 size={22} color="var(--accent)" />
                <span>FUTURA</span>
            </div>
            <button className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Abrir Menu">
                <Menu size={24} />
            </button>
        </header>
    )
}
