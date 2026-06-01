import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { supabase } from '../lib/supabase'
import { TrendingUp, Users, HardHat, DollarSign, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './Dashboard.css'

export const Dashboard = () => {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        obras: 0,
        orcamento: 0,
        gastos: 0,
        recebido: 0,
        fornecedores: 0
    })
    const [chartData, setChartData] = useState([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [obrasRes, despesasRes, entradasRes, fornecedoresRes] = await Promise.all([
                supabase.from('obras').select('*'),
                supabase.from('despesas').select('valor, data, status'),
                supabase.from('entradas').select('valor'),
                supabase.from('fornecedores').select('id', { count: 'exact' })
            ])

            const obras = obrasRes.data || []
            const despesas = despesasRes.data || []
            const entradas = entradasRes.data || []

            // Stats
            setStats({
                obras: obras.length,
                orcamento: obras.reduce((acc, curr) => acc + Number(curr.orcamento_total), 0),
                gastos: despesas.filter(d => d.status === 'pago').reduce((acc, curr) => acc + Number(curr.valor), 0),
                recebido: entradas.reduce((acc, curr) => acc + Number(curr.valor), 0),
                fornecedores: fornecedoresRes.count || 0
            })

            // Chart Data (Last 4 months)
            const last4Months = {}
            const now = new Date()
            for (let i = 3; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const label = d.toLocaleDateString('pt-BR', { month: 'short' })
                last4Months[label] = 0
            }

            despesas.filter(d => d.status === 'pago').forEach(d => {
                const date = new Date(d.data)
                const label = date.toLocaleDateString('pt-BR', { month: 'short' })
                if (last4Months[label] !== undefined) {
                    last4Months[label] += Number(d.valor)
                }
            })

            setChartData(Object.keys(last4Months).map(key => ({
                name: key,
                valor: last4Months[key]
            })))

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error)
        }
        setLoading(false)
    }

    const COLORS = ['#2563eb', '#38bdf8', '#22c55e', '#f59e0b']

    if (loading) return <div className="loading-state">Carregando painel...</div>

    return (
        <div className="dashboard-container">
            <header className="page-header">
                <h1>Painel de Controle</h1>
                <p>Visão geral de suas obras</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Obras Ativas</span>
                    <span className="stat-value">{stats.obras}</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Total em Aportes</span>
                    <span className="stat-value success">R$ {stats.recebido.toLocaleString()}</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Total Gasto</span>
                    <span className="stat-value error">R$ {stats.gastos.toLocaleString()}</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Fornecedores Ativos</span>
                    <span className="stat-value">{stats.fornecedores}</span>
                </div>
            </div>

            <Card className="chart-card">
                <div className="chart-header">
                    <h3>Evolução de Gastos (Mensal)</h3>
                    <div className="balance-indicator">
                        Saldo Global:
                        <span className={stats.recebido - stats.gastos >= 0 ? 'success' : 'error'}>
                            R$ {(stats.recebido - stats.gastos).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                itemStyle={{ color: 'white' }}
                                formatter={(value) => [`R$ ${value.toLocaleString()}`, 'Gasto']}
                            />
                            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    )
}
