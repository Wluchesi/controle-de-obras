import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import {
    ShoppingCart, Plus, Trash2, Clock, CheckCircle2,
    AlertCircle, Search, Filter, Briefcase, Package2, Edit2, User,
    Hammer, Home, Zap, Wrench, LayoutGrid, Trees, Droplets
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Compras.css'

export const Compras = () => {
    const { isAdmin } = useAuth()
    const [loading, setLoading] = useState(true)
    const [listaCompras, setListaCompras] = useState([])
    const [obrasList, setObrasList] = useState([])
    const [fornecedoresList, setFornecedoresList] = useState([])
    const [selectedObra, setSelectedObra] = useState('all')
    const [newItem, setNewItem] = useState({ item: '', quantidade: '', obra_id: '', urgencia: false })
    const [showQuoteForm, setShowQuoteForm] = useState(null)
    const [newQuote, setNewQuote] = useState({ fornecedor_id: '', preco_unitario: '', prazo_entrega: '' })
    const [editingItem, setEditingItem] = useState(null)
    const [activeCategory, setActiveCategory] = useState(null)

    // Categorias baseadas no anexo do usuário
    const MATERIAL_CATEGORIES = [
        {
            id: 'construcao',
            name: 'Materiais de Construção',
            icon: <Hammer size={20} />,
            materials: ["Painéis de EPS", "Argamassa", "Concreto", "Microconcreto projetado", "Cimento", "Areia", "Brita", "Vergalhões de aço", "Malha de aço galvanizado", "Grampos para EPS"]
        },
        {
            id: 'homecenters',
            name: 'Home Centers',
            icon: <Home size={20} />,
            materials: ["Espuma expansiva", "Selante PU", "Ferramentas manuais", "Escadas", "Carrinho de mão", "Equipamentos de proteção (EPI)"]
        },
        {
            id: 'eletrica',
            name: 'Materiais Elétricos',
            icon: <Zap size={20} />,
            materials: ["Tubulações elétricas", "Conectores metálicos", "Caixas de luz", "Fios e cabos", "Disjuntores", "Conduítes", "Quadro de energia"]
        },
        {
            id: 'ferragens',
            name: 'Ferragens e Ferramentas',
            icon: <Wrench size={20} />,
            materials: ["Pregos", "Parafusos", "Buchas", "Discos de corte", "Dobradiças", "Fechaduras"]
        },
        {
            id: 'revestimento',
            name: 'Pisos e Revestimentos',
            icon: <LayoutGrid size={20} />,
            materials: ["Massa corrida", "Massa acrílica", "Tintas látex", "Tintas acrílica", "Argamassa colante", "Rejunte", "Pisos cerâmicos", "Porcelanato"]
        },
        {
            id: 'madeira',
            name: 'Madeireiras',
            icon: <Trees size={20} />,
            materials: ["Madeiras p/ caixaria", "Tábuas", "Pontaletes", "Madeirite", "Sarrafo", "Pranchas"]
        }
    ]


    const COMMON_MATERIALS = MATERIAL_CATEGORIES.flatMap(cat => cat.materials)


    useEffect(() => {
        fetchData()
    }, [selectedObra])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [obras, fornecedores] = await Promise.all([
                supabase.from('obras').select('*'),
                supabase.from('fornecedores').select('*')
            ])
            setObrasList(obras.data || [])
            setFornecedoresList(fornecedores.data || [])

            let query = supabase.from('lista_compras')
                .select(`
                    *,
                    obras(nome),
                    cotacoes(*, fornecedores(nome))
                `)
                .order('urgencia', { ascending: false })
                .order('created_at', { ascending: false })

            if (selectedObra !== 'all') {
                query = query.eq('obra_id', selectedObra)
            }

            const { data: lista } = await query
            setListaCompras(lista || [])
        } catch (error) {
            console.error('Erro ao buscar dados de compras:', error)
        }
        setLoading(false)
    }

    const handleAddItem = async (e) => {
        e.preventDefault()
        if (!newItem.item || (!newItem.obra_id && selectedObra === 'all')) {
            alert('Por favor, preencha o item e selecione a obra.')
            return
        }

        const obraId = newItem.obra_id || selectedObra

        try {
            const { error } = await supabase.from('lista_compras').insert([{
                item: newItem.item,
                quantidade: newItem.quantidade,
                obra_id: obraId,
                urgencia: newItem.urgencia,
                status: 'pendente'
            }])

            if (error) throw error

            setNewItem({ item: '', quantidade: '', obra_id: '', urgencia: false })
            fetchData()
        } catch (error) {
            console.error('Erro ao adicionar item:', error)
        }
    }

    const toggleStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'pendente' ? 'comprado' : 'pendente'
        try {
            await supabase.from('lista_compras').update({ status: nextStatus }).eq('id', id)
            fetchData()
        } catch (error) {
            console.error('Erro ao atualizar status:', error)
        }
    }

    const handleAddQuote = async (itemId) => {
        if (!newQuote.fornecedor_id || !newQuote.preco_unitario) return

        try {
            const { error } = await supabase.from('cotacoes').insert([{
                item_compra_id: itemId,
                fornecedor_id: newQuote.fornecedor_id,
                preco_unitario: Number(newQuote.preco_unitario),
                prazo_entrega: Number(newQuote.prazo_entrega),
                selecionada: false
            }])

            if (error) throw error
            setNewQuote({ fornecedor_id: '', preco_unitario: '', prazo_entrega: '' })
            setShowQuoteForm(null)
            fetchData()
        } catch (error) {
            console.error('Erro ao adicionar cotação:', error)
        }
    }

    const approveQuote = async (item, quote) => {
        if (!confirm(`Confirmar compra com ${quote.fornecedores?.nome} por R$ ${quote.preco_unitario}?`)) return

        try {
            await supabase.from('cotacoes').update({ selecionada: true }).eq('id', quote.id)
            await supabase.from('lista_compras').update({ status: 'comprado' }).eq('id', item.id)

            const { error: expError } = await supabase.from('despesas').insert([{
                obra_id: item.obra_id,
                fornecedor_id: quote.fornecedor_id,
                categoria: 'material',
                valor: Number(quote.preco_unitario),
                observacoes: `Compra: ${item.item} (${item.quantidade})`,
                status: 'pendente',
                vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                data: new Date().toISOString().split('T')[0]
            }])

            if (expError) {
                console.error("Erro ao gerar despesa:", expError)
                alert('Compra aprovada, mas houve um erro ao gerar a despesa financeira: ' + expError.message)
            } else {
                alert('Compra aprovada e despesa gerada no financeiro com sucesso!')
            }
            fetchData()
        } catch (error) {
            console.error('Erro ao aprovar cotação:', error)
        }
    }

    const deleteItem = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return
        try {
            await supabase.from('lista_compras').delete().eq('id', id)
            fetchData()
        } catch (error) {
            console.error('Erro ao excluir item:', error)
        }
    }

    const handleUpdateItem = async (e) => {
        e.preventDefault()
        try {
            const { error } = await supabase.from('lista_compras')
                .update({
                    item: editingItem.item,
                    quantidade: editingItem.quantidade,
                    obra_id: editingItem.obra_id,
                    urgencia: editingItem.urgencia
                })
                .eq('id', editingItem.id)

            if (error) throw error
            setEditingItem(null)
            fetchData()
        } catch (error) {
            console.error('Erro ao atualizar item:', error)
            alert('Erro ao atualizar item.')
        }
    }

    return (
        <div className="compras-container">
            <header className="page-header with-action">
                <div className="header-content">
                    <h1>Gestão de Compras</h1>
                    <p>Controle de materiais e necessidades das obras</p>
                </div>
                <div className="filter-group">
                    <Briefcase size={16} />
                    <select
                        className="filter-select"
                        value={selectedObra}
                        onChange={(e) => setSelectedObra(e.target.value)}
                    >
                        <option value="all">Todas as Obras</option>
                        {obrasList.map(obra => (
                            <option key={obra.id} value={obra.id}>{obra.nome}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="categories-grid animate-in">
                {MATERIAL_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-selector-card ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    >
                        <div className="cat-icon">{cat.icon}</div>
                        <span>{cat.name}</span>
                    </button>
                ))}
            </div>

            {activeCategory && (
                <div className="quick-chips animate-in">
                    {MATERIAL_CATEGORIES.find(c => c.id === activeCategory)?.materials.map((mat, i) => (
                        <button
                            key={i}
                            type="button"
                            className="material-chip"
                            onClick={() => setNewItem({ ...newItem, item: mat })}
                        >
                            <Plus size={12} />
                            {mat}
                        </button>
                    ))}
                </div>
            )}

            {isAdmin && (
                <form className="quick-add-form animate-in" onSubmit={handleAddItem}>
                    <input
                        className="quick-add-input"
                        placeholder="O que precisa ser comprado?"
                        value={newItem.item}
                        onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                        list="materials-list"
                    />
                    <datalist id="materials-list">
                        {COMMON_MATERIALS.map((mat, i) => <option key={i} value={mat} />)}
                    </datalist>
                    <input
                        className="quick-add-input"
                        placeholder="Qtd/Und"
                        style={{ maxWidth: '120px' }}
                        value={newItem.quantidade}
                        onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })}
                    />
                    {selectedObra === 'all' && (
                        <select
                            className="quick-add-input"
                            style={{ maxWidth: '200px' }}
                            value={newItem.obra_id}
                            onChange={(e) => setNewItem({ ...newItem, obra_id: e.target.value })}
                        >
                            <option value="">Selecionar Obra</option>
                            {obrasList.map(obra => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
                        </select>
                    )}
                    <Button type="submit" className="btn-pay">
                        <Plus size={18} />
                        Adicionar
                    </Button>
                </form>
            )}

            <div className="compras-content">
                <section className="shopping-list-section">
                    <div className="section-header">
                        <h2>Lista de Materiais</h2>
                        <span className="badge pendente">{listaCompras.filter(i => i.status === 'pendente').length} Pendentes</span>
                    </div>

                    <div className="items-list">
                        {loading ? (
                            <p>Carregando lista...</p>
                        ) : listaCompras.length > 0 ? (
                            listaCompras.map(item => (
                                <div key={item.id} className={`compra-card animate-in ${item.urgencia ? 'urgente-border' : ''}`}>
                                    <div className="compra-item">
                                        <div className="compra-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <span className="compra-name">{item.item}</span>
                                                <span className={`badge ${item.status}`}>{item.status}</span>
                                            </div>
                                            <div className="compra-meta">
                                                <span><Package2 size={14} /> {item.quantidade || 'S/ qtd'}</span>
                                                <span><Briefcase size={14} /> {item.obras?.nome}</span>
                                                {item.urgencia && <span className="badge urgente">URGENTE</span>}
                                            </div>
                                        </div>
                                        <div className="compra-actions">
                                            {isAdmin && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="action-btn-minimal"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteItem(item.id)}
                                                        className="action-btn-minimal"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                            <Button variant="secondary" size="sm" onClick={() => setShowQuoteForm(showQuoteForm === item.id ? null : item.id)}>
                                                {item.cotacoes?.length || 0} Cotações
                                            </Button>
                                        </div>
                                    </div>

                                    {showQuoteForm === item.id && (
                                        <div className="quotes-panel animate-in">
                                            <div className="quotes-list">
                                                {item.cotacoes?.map(quote => (
                                                    <div key={quote.id} className={`quote-row ${quote.selecionada ? 'selected' : ''}`}>
                                                        <div className="quote-provider">
                                                            <strong>{quote.fornecedores?.nome}</strong>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                {quote.prazo_entrega} dias p/ entrega
                                                            </div>
                                                        </div>
                                                        <div className="quote-price" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>R$ {Number(quote.preco_unitario).toLocaleString()}</span>
                                                            {!quote.selecionada && item.status !== 'comprado' && isAdmin && (
                                                                <Button size="sm" onClick={() => approveQuote(item, quote)} className="btn-pay">
                                                                    Aprovar
                                                                </Button>
                                                            )}
                                                            {quote.selecionada && <CheckCircle2 size={18} className="success-icon" color="var(--success)" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {item.status !== 'comprado' && isAdmin && (
                                                <div className="add-quote-form" style={{ display: 'flex', gap: '8px' }}>
                                                    <select
                                                        className="quick-add-input"
                                                        value={newQuote.fornecedor_id}
                                                        onChange={(e) => setNewQuote({ ...newQuote, fornecedor_id: e.target.value })}
                                                    >
                                                        <option value="">Fornecedor...</option>
                                                        {fornecedoresList.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                                    </select>
                                                    <input
                                                        className="quick-add-input"
                                                        type="number"
                                                        placeholder="Preço R$"
                                                        value={newQuote.preco_unitario}
                                                        onChange={(e) => setNewQuote({ ...newQuote, preco_unitario: e.target.value })}
                                                    />
                                                    <input
                                                        className="quick-add-input"
                                                        type="number"
                                                        placeholder="Prazo (dias)"
                                                        value={newQuote.prazo_entrega}
                                                        onChange={(e) => setNewQuote({ ...newQuote, prazo_entrega: e.target.value })}
                                                    />
                                                    <Button onClick={() => handleAddQuote(item.id)} className="btn-pay">
                                                        <Plus size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <ShoppingCart size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p>Nenhum item na lista de compras.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
            {editingItem && isAdmin && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}>
                    <div className="edit-modal animate-in">
                        <header className="page-header" style={{ marginBottom: '20px' }}>
                            <h3>Editar Item</h3>
                            <button onClick={() => setEditingItem(null)} className="action-btn-minimal" style={{ fontSize: '1.5rem' }}>×</button>
                        </header>
                        <form onSubmit={handleUpdateItem}>
                            <div className="form-group">
                                <label className="input-label" style={{ display: 'block', marginBottom: '6px' }}>Item/Material</label>
                                <input
                                    className="quick-add-input"
                                    style={{ width: '100%' }}
                                    value={editingItem.item}
                                    onChange={(e) => setEditingItem({ ...editingItem, item: e.target.value })}
                                    required
                                    list="materials-list"
                                />
                            </div>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="input-label" style={{ display: 'block', marginBottom: '6px' }}>Quantidade</label>
                                <input
                                    className="quick-add-input"
                                    style={{ width: '100%' }}
                                    value={editingItem.quantidade}
                                    onChange={(e) => setEditingItem({ ...editingItem, quantidade: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="input-label" style={{ display: 'block', marginBottom: '6px' }}>Obra</label>
                                <select
                                    className="quick-add-input"
                                    style={{ width: '100%' }}
                                    value={editingItem.obra_id}
                                    onChange={(e) => setEditingItem({ ...editingItem, obra_id: e.target.value })}
                                >
                                    {obrasList.map(obra => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
                                </select>
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <label className="urgencia-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={editingItem.urgencia}
                                        onChange={(e) => setEditingItem({ ...editingItem, urgencia: e.target.checked })}
                                    />
                                    Marcar como Urgente
                                </label>
                            </div>
                            <div className="form-actions" style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} style={{ flex: 1 }}>Cancelar</Button>
                                <Button type="submit" style={{ flex: 1 }}>Salvar Alterações</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
