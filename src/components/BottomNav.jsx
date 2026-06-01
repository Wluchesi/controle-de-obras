import React, { useEffect, useRef } from 'react'
import { Home, HardHat, DollarSign, FileText, Users, Settings, Truck, Calendar, ShoppingCart } from 'lucide-react'
import './BottomNav.css'

export const BottomNav = ({ activeTab, onTabChange }) => {
    const activeRef = useRef(null)

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            })
        }
    }, [activeTab])

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

    return (
        <nav className="bottom-nav glass">
            {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                    <button
                        key={tab.id}
                        ref={activeTab === tab.id ? activeRef : null}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <Icon size={20} />
                        <span>{tab.label}</span>
                    </button>
                )
            })}
        </nav>
    )
}
