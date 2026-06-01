import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Plus, Filter, Tag, Calendar, Receipt, ArrowUpCircle, ArrowDownCircle, User, Pencil, Trash2 } from 'lucide-react'
import { TransactionForm } from './TransactionForm'
import { useAuth } from '../contexts/AuthContext'
import './Despesas.css'

const formatDisplayDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
}

export const Despesas = () => {
    const { isAdmin } = useAuth()
    const [transactions, setTransactions] = useState([])
    const [obras, setObras] = useState([])
    const [fornecedores, setFornecedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formType, setFormType] = useState('despesa')
    const [filterObra, setFilterObra] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [obrasRes, despesasRes, entradasRes, fornecedoresRes] = await Promise.all([
            supabase.from('obras').select('id, nome'),
            supabase.from('despesas').select('*, obras(nome), fornecedores(nome)').order('data', { ascending: false }),
            supabase.from('entradas').select('*, obras(nome)').order('data', { ascending: false }),
            supabase.from('fornecedores').select('id, nome, obra_id, funcao')
        ])

        if (obrasRes.data) setObras(obrasRes.data)
        if (fornecedoresRes.data) setFornecedores(fornecedoresRes.data)

        const combined = [
            ...(despesasRes.data || []).map(d => ({ ...d, type: 'despesa' })),
            ...(entradasRes.data || []).map(e => ({ ...e, type: 'entrada', categoria: 'aporte', observacoes: e.descricao }))
        ].sort((a, b) => {
            const dateA = a.type === 'despesa' ? (a.vencimento || a.data) : a.data;
            const dateB = b.type === 'despesa' ? (b.vencimento || b.data) : b.data;
            return new Date(dateB) - new Date(dateA);
        })

        setTransactions(combined)
        setLoading(false)
    }

    const handleSaveTransaction = async (payload, type) => {
        const table = type === 'despesa' ? 'despesas' : 'entradas'

        let result;
        if (editingId) {
            result = await supabase.from(table).update(payload).eq('id', editingId)
        } else {
            result = await supabase.from(table).insert([payload])
        }

        const { error } = result

        if (error) {
            console.error("Erro ao salvar:", error)
            alert("Erro ao salvar: " + error.message)
            return
        }

        setShowForm(false)
        setEditingId(null)
        fetchData()
    }

    const handleEdit = (t) => {
        setEditingId(t.id)
        setFormType(t.type)
        setShowForm(true)
    }

    const handleDelete = async (id, type) => {
        if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return

        const table = type === 'despesa' ? 'despesas' : 'entradas'
        const { error } = await supabase.from(table).delete().eq('id', id)

        if (error) {
            alert('Erro ao excluir: ' + error.message)
        } else {
            fetchData()
        }
    }

    const filteredTransactions = transactions.filter(t => {
        const matchObra = filterObra === 'all' || t.obra_id === filterObra
        const date = t.type === 'despesa' ? (t.vencimento || t.data) : t.data
        const matchStart = !startDate || date >= startDate
        const matchEnd = !endDate || date <= endDate
        return matchObra && matchStart && matchEnd
    })

    const stats = filteredTransactions.reduce((acc, curr) => {
        if (curr.is_previsao) return acc
        if (curr.type === 'entrada') {
            acc.entradas += parseFloat(curr.valor)
        } else {
            if (curr.status === 'pago') {
                acc.saidas += parseFloat(curr.valor)
            } else {
                acc.pendentes += parseFloat(curr.valor)
            }
        }
        return acc
    }, { entradas: 0, saidas: 0, pendentes: 0 })

    return (
        <div className="despesas-container">
            <header className="page-header with-action">
                <div>
                    <h1>Financeiro</h1>
                    <p>Fluxo de caixa e controle de custos</p>
                </div>
                {isAdmin && (
                    <div className="header-actions">
                        <Button variant="secondary" onClick={() => { setFormType('entrada'); setEditingId(null); setShowForm(true); }}>
                            <ArrowUpCircle size={18} />
                            Entrada
                        </Button>
                        <Button onClick={() => { setFormType('despesa'); setEditingId(null); setShowForm(true); }}>
                            <Plus size={18} />
                            Despesas
                        </Button>
                    </div>
                )}
            </header>

            <div className="cashflow-summary animate-in">
                <div className="summary-card">
                    <span className="summary-label">Entradas</span>
                    <span className="summary-value" style={{ color: 'var(--text-main)' }}>R$ {stats.entradas.toLocaleString()}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">Saídas (Pagas)</span>
                    <span className="summary-value" style={{ color: 'var(--error)' }}>R$ {stats.saidas.toLocaleString()}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">A Pagar (Pendente)</span>
                    <span className="summary-value" style={{ color: 'var(--warning)' }}>R$ {stats.pendentes.toLocaleString()}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">Saldo em Caixa</span>
                    <span className="summary-value" style={{ color: stats.entradas - stats.saidas >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        R$ {(stats.entradas - stats.saidas).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="filters-bar animate-in">
                <div className="filter-item">
                    <Filter size={16} />
                    <select
                        className="filter-select"
                        value={filterObra}
                        onChange={(e) => setFilterObra(e.target.value)}
                    >
                        <option value="all">Todas as Obras</option>
                        {obras.map(obra => (
                            <option key={obra.id} value={obra.id}>{obra.nome}</option>
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
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="filter-summary">
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transação' : 'transações'}
                </div>
            </div>

            {showForm && isAdmin && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <TransactionForm
                        initialType={formType}
                        initialData={editingId ? transactions.find(t => t.id === editingId) : null}
                        obras={obras}
                        fornecedores={fornecedores}
                        onSave={handleSaveTransaction}
                        onCancel={() => { setShowForm(false); setEditingId(null); }}
                    />
                </div>
            )}

            <div className="despesas-list">
                {loading ? (
                    <p>Carregando...</p>
                ) : filteredTransactions.length === 0 ? (
                    <Card className="empty-state">
                        <p>Nenhuma transação encontrada.</p>
                    </Card>
                ) : (
                    filteredTransactions.map(t => (
                        <div key={`${t.type}-${t.id}`} className="despesa-item animate-in">
                            <div className="despesa-main">
                                <div className="transaction-type-icon">
                                    <div className={`icon-bg ${t.type}`}>
                                        {t.type === 'entrada' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div className="item-title-area">
                                        <span className="despesa-obra">{t.obras?.nome || 'Obra não identificada'}</span>
                                        <div className="transaction-tags">
                                            <span className={`badge ${t.categoria === 'mao_de_obra' ? 'labor' : (t.categoria === 'aporte' || t.type === 'entrada') ? 'sucesso' : 'secondary'}`}>
                                                <Tag size={12} /> {t.categoria === 'mao_de_obra' ? 'Prestação de Serviço' : t.categoria === 'aporte' ? 'APORTE' : t.categoria.charAt(0).toUpperCase() + t.categoria.slice(1).replace('_', ' ')}
                                            </span>
                                            {t.fornecedores?.nome && (
                                                <span className="badge neutral">
                                                    <User size={12} /> {t.fornecedores.nome} {t.fornecedores.funcao ? ` (${t.fornecedores.funcao})` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div className={`despesa-value ${t.type}`}>
                                        {t.type === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString()}
                                    </div>
                                    {isAdmin && (
                                        <div className="item-actions-top">
                                            <button className="action-btn-minimal" onClick={() => handleEdit(t)}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="action-btn-minimal" onClick={() => handleDelete(t.id, t.type)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="despesa-meta">
                                <span className="meta-item">
                                    <Calendar size={12} /> {formatDisplayDate(t.type === 'despesa' ? (t.vencimento || t.data) : t.data)}
                                </span>
                                {t.observacoes && (
                                    <span className="meta-item">
                                        <Receipt size={12} /> {t.observacoes}
                                    </span>
                                )}
                                {t.is_previsao && (
                                    <span className="badge warning">PREVISÃO</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
