import React, { useEffect, useRef, useState } from 'react'
import { Home, HardHat, DollarSign, FileText, Users, Settings, Truck, Calendar, ShoppingCart } from 'lucide-react'
import './BottomNav.css'

export const BottomNav = ({ activeTab, onTabChange }) => {
    const navRef = useRef(null)
    const activeRef = useRef(null)
    const [showLeftFade, setShowLeftFade] = useState(false)
    const [showRightFade, setShowRightFade] = useState(true)

    // Scroll active element into center view
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            })
        }
    }, [activeTab])

    // Mount nudge/bounce animation to hint scrollability
    useEffect(() => {
        if (navRef.current) {
            setTimeout(() => {
                if (navRef.current) {
                    navRef.current.scrollTo({ left: 45, behavior: 'smooth' })
                    setTimeout(() => {
                        if (navRef.current) {
                            navRef.current.scrollTo({ left: 0, behavior: 'smooth' })
                        }
                    }, 400)
                }
            }, 800)
        }
    }, [])

    const handleScroll = () => {
        if (!navRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = navRef.current
        setShowLeftFade(scrollLeft > 5)
        setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5)
    }

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
        <div className="bottom-nav-wrapper">
            {showLeftFade && <div className="nav-fade left" />}
            <nav 
                ref={navRef} 
                className="bottom-nav glass"
                onScroll={handleScroll}
            >
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
            {showRightFade && <div className="nav-fade right" />}
        </div>
    )
}
