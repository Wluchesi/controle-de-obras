import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Calendar, AlertCircle, CheckCircle, Search, Filter, DollarSign, Clock, Users, Pencil, Trash2, Package2 } from 'lucide-react'
import { TransactionForm } from './TransactionForm'
import './ContasAPagar.css'

const formatDisplayDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
}

const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const ContasAPagar = () => {
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('pendente')
    const [filterObra, setFilterObra] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [obras, setObras] = useState([])
    const [fornecedores, setFornecedores] = useState([])
    const [contas, setContas] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [stats, setStats] = useState({ total: 0, atrasadas: 0, hoje: 0, pagos: 0 })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [obrasRes, contasRes, fornecedoresRes] = await Promise.all([
            supabase.from('obras').select('id, nome'),
            supabase.from('despesas').select('*, obras(nome), fornecedores(nome)').order('vencimento', { ascending: true }),
            supabase.from('fornecedores').select('id, nome, obra_id, funcao')
        ])

        if (obrasRes.data) setObras(obrasRes.data)
        if (fornecedoresRes.data) setFornecedores(fornecedoresRes.data)
        if (contasRes.data) {
            setContas(contasRes.data.map(d => ({ ...d, type: 'despesa' })))
            calculateStats(contasRes.data)
        }
        setLoading(false)
    }

    const calculateStats = (allContas) => {
        const now = getLocalDateStr()
        const pending = allContas.filter(c => c.status === 'pendente')

        setStats({
            total: pending.reduce((sum, c) => sum + parseFloat(c.valor), 0),
            atrasadas: pending.filter(c => c.vencimento < now).reduce((sum, c) => sum + parseFloat(c.valor), 0),
            hoje: pending.filter(c => c.vencimento === now).reduce((sum, c) => sum + parseFloat(c.valor), 0),
            pagos: allContas.filter(c => c.status === 'pago').reduce((sum, c) => sum + parseFloat(c.valor), 0)
        })
    }

    const handleMarkAsPaid = async (id) => {
        const { error } = await supabase
            .from('despesas')
            .update({ status: 'pago' })
            .eq('id', id)

        if (!error) {
            fetchData()
        }
    }

    const handleSaveTransaction = async (payload, type) => {
        const table = type === 'despesa' ? 'despesas' : 'entradas'

        let result;
        if (editingId) {
            result = await supabase.from(table).update(payload).eq('id', editingId)
        } else {
            result = await supabase.from(table).insert([payload])
        }

        if (!result.error) {
            setShowForm(false)
            setEditingId(null)
            fetchData()
        } else {
            alert('Erro ao salvar: ' + result.error.message)
        }
    }

    const handleEdit = (id) => {
        setEditingId(id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return
        const { error } = await supabase.from('despesas').delete().eq('id', id)
        if (!error) fetchData()
        else alert('Erro ao excluir: ' + error.message)
    }

    const filteredContas = contas.filter(c => {
        const matchStatus = filterStatus === 'all' || c.status === filterStatus
        const matchObra = filterObra === 'all' || c.obra_id === filterObra
        const matchStart = !startDate || c.vencimento >= startDate
        const matchEnd = !endDate || c.vencimento <= endDate
        return matchStatus && matchObra && matchStart && matchEnd
    })

    const isAtrasada = (vencimento, status) => {
        if (status === 'pago') return false
        const now = getLocalDateStr()
        return vencimento < now
    }

    return (
        <div className="contas-container">
            <header className="page-header with-action">
                <div className="header-content">
                    <h1>Contas a Pagar</h1>
                    <p>Gestão financeira de obrigações e vencimentos.</p>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card pending">
                    <div className="stat-info">
                        <span>A Vencer</span>
                        <h3>R$ {stats.total.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card overdue">
                    <div className="stat-info">
                        <span>Em Atraso</span>
                        <h3>R$ {stats.atrasadas.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card today">
                    <div className="stat-info">
                        <span>Vence Hoje</span>
                        <h3>R$ {stats.hoje.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card paid">
                    <div className="stat-info">
                        <span>Total Pago</span>
                        <h3>R$ {stats.pagos.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="filters-section">
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="pendente">A Vencer</option>
                        <option value="pago">Pagas</option>
                        <option value="all">Todas</option>
                    </select>
                </div>
                <div className="filter-group">
                    <Search size={18} />
                    <select value={filterObra} onChange={e => setFilterObra(e.target.value)}>
                        <option value="all">Todas as Obras</option>
                        {obras.map(o => (
                            <option key={o.id} value={o.id}>{o.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <Calendar size={18} />
                    <input
                        type="date"
                        className="date-filter-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Início"
                    />
                    <span style={{ color: 'var(--text-muted)' }}>até</span>
                    <input
                        type="date"
                        className="date-filter-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="Fim"
                    />
                    {(startDate || endDate) && (
                        <button className="clear-filter" onClick={() => { setStartDate(''); setEndDate(''); }}>
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            <div className="contas-list">
                {loading ? (
                    <p>Carregando...</p>
                ) : filteredContas.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhuma conta encontrada para o filtro selecionado.</p>
                    </div>
                ) : (
                    filteredContas.map(conta => (
                        <div key={conta.id} className={`conta-card animate-in ${isAtrasada(conta.vencimento, conta.status) ? 'overdue' : ''}`}>
                            <div className="conta-main">
                                <div className="conta-info">
                                    <div className="info-top">
                                        <span className={`badge ${conta.status === 'pago' ? 'sucesso' : 'pendente'}`}>
                                            {conta.status === 'pago' ? 'Pago' : 'A Vencer'}
                                        </span>
                                        <span className="badge neutral">{conta.categoria}</span>
                                        {conta.is_previsao && (
                                            <span className="badge warning">PREVISÃO</span>
                                        )}
                                    </div>
                                    <h3>{conta.observacoes || 'Sem descrição'}</h3>
                                    <div className="meta-info">
                                        <span><Calendar size={14} /> {conta.obras?.nome}</span>
                                        {conta.fornecedores && (
                                            <span><Users size={14} /> {conta.fornecedores.nome} {conta.fornecedores.funcao ? ` (${conta.fornecedores.funcao})` : ''}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="conta-financial">
                                    <div className="valor">R$ {parseFloat(conta.valor).toLocaleString()}</div>
                                    <div className={`vencimento ${isAtrasada(conta.vencimento, conta.status) ? 'urgent' : ''}`}>
                                        {isAtrasada(conta.vencimento, conta.status) ? 'Atrasado em: ' : 'Vence em: '} {formatDisplayDate(conta.vencimento)}
                                    </div>
                                    <div className="conta-actions-row">
                                        {conta.status === 'pendente' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleMarkAsPaid(conta.id)}
                                                className="btn-pay"
                                            >
                                                Pagar
                                            </Button>
                                        )}
                                        <div className="item-actions">
                                            <button className="action-btn-minimal" onClick={() => handleEdit(conta.id)} title="Editar">
                                                <Pencil size={16} />
                                            </button>
                                            <button className="action-btn-minimal" onClick={() => handleDelete(conta.id)} title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="edit-modal animate-in" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                        <TransactionForm
                            initialType="despesa"
                            initialData={editingId ? contas.find(c => c.id === editingId) : null}
                            obras={obras}
                            fornecedores={fornecedores}
                            onSave={handleSaveTransaction}
                            onCancel={() => { setShowForm(false); setEditingId(null); }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
