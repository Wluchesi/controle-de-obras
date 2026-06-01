import React from 'react'
import { Home, HardHat, DollarSign, FileText, Users, Settings, Truck, Calendar, ShoppingCart, X } from 'lucide-react'
import './SidebarMenu.css'

export const SidebarMenu = ({ isOpen, onClose, activeTab, onTabChange }) => {
    const tabs = [
        { id: 'dashboard', icon: Home, label: 'Início' },
        { id: 'obras', icon: HardHat, label: 'Obras' },
        { id: 'custos', icon: DollarSign, label: 'Financeiro' },
        { id: 'compras', icon: ShoppingCart, label: 'Compras' },
        { id: 'contas', icon: Calendar, label: 'Contas' },
        { id: 'fornecedores', icon: Truck, label: 'Equipe' },
        { id: 'relatorios', icon: FileText, label: 'Relatórios' },
        { id: 'config', icon: Settings, label: 'Ajustes' },
    ]

    const handleItemClick = (id) => {
        onTabChange(id)
        onClose()
    }

    return (
        <>
            {/* Backdrop overlay */}
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>

            {/* Slide-out Drawer */}
            <aside className={`sidebar-drawer glass ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Menu</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Fechar Menu">
                        <X size={24} />
                    </button>
                </div>
                <ul className="sidebar-nav-list">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <li key={tab.id}>
                                <button
                                    className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => handleItemClick(tab.id)}
                                >
                                    <Icon size={20} className="icon" />
                                    <span>{tab.label}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </aside>
        </>
    )
}
