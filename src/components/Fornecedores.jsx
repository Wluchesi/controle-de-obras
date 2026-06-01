import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { UserPlus, User, Phone, Briefcase, History, DollarSign, FileText, Printer, Share2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Fornecedores.css'

import { formatCPF, formatCNPJ } from '../utils/masks'
import { Edit2, Trash2, Filter, AlertCircle } from 'lucide-react'

export const Fornecedores = () => {
    const { isAdmin } = useAuth()
    const [loading, setLoading] = useState(true)
    const [fornecedores, setFornecedores] = useState([])
    const [filterObra, setFilterObra] = useState('all')
    const [isEditing, setIsEditing] = useState(false)
    const [obras, setObras] = useState([])
    const [pagamentos, setPagamentos] = useState([])
    const [despesasPorFornecedor, setDespesasPorFornecedor] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [selectedFornecedor, setSelectedFornecedor] = useState(null)
    const [lastPayment, setLastPayment] = useState(null)
    const [ownerData, setOwnerData] = useState(null)
    const [newFornecedor, setNewFornecedor] = useState({
        obra_id: '',
        nome: '',
        funcao: '',
        contato: '',
        subcategoria: 'prestador_servico',
        documento_tipo: 'cpf',
        documento_numero: ''
    })
    const [duplicateError, setDuplicateError] = useState(null)
    const [duplicateModal, setDuplicateModal] = useState({ open: false, name: '', doc: '' })
    const [isSaving, setIsSaving] = useState(false)
    const [paymentData, setPaymentData] = useState({
        valor: '',
        data: new Date().toISOString().split('T')[0],
        referente: 'Honorários'
    })
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [isPrinting, setIsPrinting] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [obrasRes, fornecedoresRes, paymentsRes, expensesRes, ownerRes] = await Promise.all([
            supabase.from('obras').select('id, nome'),
            supabase.from('fornecedores').select('*, obras(nome)').order('nome', { ascending: true }),
            supabase.from('pagamentos_fornecedores').select('fornecedor_id, valor'),
            supabase.from('despesas').select('fornecedor_id, valor').not('fornecedor_id', 'is', null),
            supabase.from('configuracoes').select('*').single()
        ])

        if (obrasRes.data) setObras(obrasRes.data)
        if (fornecedoresRes.data) setFornecedores(fornecedoresRes.data)
        if (paymentsRes.data) setPagamentos(paymentsRes.data)
        if (expensesRes.data) setDespesasPorFornecedor(expensesRes.data)
        if (ownerRes.data) setOwnerData(ownerRes.data)

        setLoading(false)
    }

    const calculateTotals = (fornecedorId) => {
        const total = (despesasPorFornecedor || [])
            .filter(d => d.fornecedor_id === fornecedorId)
            .reduce((sum, d) => sum + parseFloat(d.valor), 0)

        return { total }
    }

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault()
        if (isSaving) return
        setIsSaving(true)
        setDuplicateError(null)

        try {
            const cleanDoc = newFornecedor.documento_numero.replace(/\D/g, '')
            console.log('Iniciando validação de documento:', cleanDoc)

            // Duplicate check (only on creation or if document changed)
            if (cleanDoc) {
                let query = supabase
                    .from('fornecedores')
                    .select('id, nome')
                    .eq('documento_numero', cleanDoc)

                if (isEditing) {
                    query = query.neq('id', newFornecedor.id)
                }

                const { data: existing, error: checkError } = await query

                if (checkError) {
                    console.error('Erro ao verificar duplicidade:', checkError)
                    throw new Error('Falha na verificação de segurança.')
                }

                if (existing && existing.length > 0) {
                    console.log('Duplicata encontrada:', existing[0])
                    setDuplicateModal({
                        open: true,
                        name: existing[0].name || existing[0].nome, // handles possible case differences
                        doc: newFornecedor.documento_numero
                    })
                    setIsSaving(false)
                    return
                }
            }

            // Clean payload: remove joined fields and ID before sending to DB
            const { obras, ...dataToSave } = newFornecedor
            const payload = {
                ...dataToSave,
                documento_numero: cleanDoc
            }

            let res
            if (isEditing) {
                res = await supabase.from('fornecedores').update(payload).eq('id', newFornecedor.id)
            } else {
                res = await supabase.from('fornecedores').insert([payload])
            }

            if (res.error) {
                console.error('Erro ao salvar fornecedor:', res.error)
                alert('Erro ao salvar fornecedor: ' + res.error.message)
            } else {
                setNewFornecedor({
                    obra_id: '',
                    nome: '',
                    funcao: '',
                    contato: '',
                    subcategoria: 'prestador_servico',
                    documento_tipo: 'cpf',
                    documento_numero: ''
                })
                setShowForm(false)
                setIsEditing(false)
                fetchData()
            }
        } catch (err) {
            console.error('Erro fatal no salvamento:', err)
            alert('Erro inesperado ao salvar.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (fornecedor) => {
        setNewFornecedor({
            ...fornecedor,
            documento_numero: fornecedor.documento_tipo === 'cpf' ? formatCPF(fornecedor.documento_numero || '') : formatCNPJ(fornecedor.documento_numero || '')
        })
        setIsEditing(true)
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (fornecedorId) => {
        if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return

        // Integrity Check
        const { data: payments } = await supabase.from('pagamentos_fornecedores').select('id').eq('fornecedor_id', fornecedorId).limit(1)
        const { data: expenses } = await supabase.from('despesas').select('id').eq('fornecedor_id', fornecedorId).limit(1)

        if ((payments && payments.length > 0) || (expenses && expenses.length > 0)) {
            alert('Não é possível excluir este fornecedor pois ele já possui lançamentos financeiros vinculados.')
            return
        }

        const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedorId)
        if (!error) fetchData()
    }

    const openPaymentModal = (fornecedor) => {
        setSelectedFornecedor(fornecedor)
        setPaymentData({
            valor: '',
            data: new Date().toISOString().split('T')[0],
            referente: 'Honorários'
        })
        setShowPaymentModal(true)
    }

    const handleRegisterPayment = async (e) => {
        e.preventDefault()
        if (!selectedFornecedor) return
        setPaymentLoading(true)

        try {
            const { error: pError } = await supabase.from('pagamentos_fornecedores').insert([
                {
                    fornecedor_id: selectedFornecedor.id,
                    valor: paymentData.valor,
                    data: paymentData.data,
                    referente: paymentData.referente,
                    status: 'pago'
                }
            ])

            if (pError) throw pError

            const { error: dError } = await supabase.from('despesas').insert([
                {
                    obra_id: selectedFornecedor.obra_id,
                    categoria: 'mao_de_obra',
                    valor: paymentData.valor,
                    observacoes: `Pagamento: ${selectedFornecedor.nome} - ${paymentData.referente}`,
                    data: paymentData.data,
                    fornecedor_id: selectedFornecedor.id
                }
            ])

            if (dError) throw dError

            setLastPayment({
                valor: paymentData.valor,
                data_pagamento: paymentData.data,
                referente: paymentData.referente,
                fornecedor_nome: selectedFornecedor.nome,
                fornecedor_funcao: selectedFornecedor.funcao,
                fornecedor_contato: selectedFornecedor.contato,
                obra_nome: selectedFornecedor.obras?.nome
            })

            setShowPaymentModal(false)
            setShowReceiptModal(true)
            fetchData()
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error)
            alert('Falha ao registrar pagamento.')
        } finally {
            setPaymentLoading(false)
        }
    }

    const handleShareWhatsApp = (payment) => {
        const message = `*RECIBO DE PAGAMENTO*\n\n` +
            `Recebi de *${ownerData?.proprietario_nome || 'Futura Obras'}* a quantia de *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.valor)}* ` +
            `referente a *${payment.referente}*.\n\n` +
            `Data: ${new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}\n\n` +
            `_Gerado por Futura Gerenciamento de Obras_`

        const phone = payment.fornecedor_contato?.replace(/\D/g, '') || ''
        const url = `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fornecedores-container">
            <header className="page-header with-action print-hide">
                <div>
                    <h2>Fornecedores</h2>
                    <p>Gerenciamento de prestadores, materiais e locações.</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => {
                        setIsEditing(false)
                        setNewFornecedor({
                            obra_id: '',
                            nome: '',
                            funcao: '',
                            contato: '',
                            subcategoria: 'prestador_servico',
                            documento_tipo: 'cpf',
                            documento_numero: ''
                        })
                        setShowForm(!showForm)
                    }}>
                        <UserPlus size={18} />
                        Novo
                    </Button>
                )}
            </header>

            <div className="filter-bar print-hide" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Filter size={18} color="var(--accent)" />
                <select
                    className="input-field"
                    style={{ maxWidth: '250px', marginBottom: 0 }}
                    value={filterObra}
                    onChange={(e) => setFilterObra(e.target.value)}
                >
                    <option value="all">Todas as Obras</option>
                    {obras.map(obra => (
                        <option key={obra.id} value={obra.id}>{obra.nome}</option>
                    ))}
                </select>
            </div>

            {showForm && isAdmin && (
                <Card className="form-card animate-in print-hide">
                    <h3 style={{ marginBottom: '15px' }}>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                    <form onSubmit={handleCreateOrUpdate}>
                        <div className="form-grid">
                            <div className="input-group">
                                <label className="input-label">Alocado na Obra</label>
                                <select
                                    className="input-field"
                                    value={newFornecedor.obra_id}
                                    onChange={(e) => setNewFornecedor({ ...newFornecedor, obra_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma obra</option>
                                    {obras.map(obra => (
                                        <option key={obra.id} value={obra.id}>{obra.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Tipo de Fornecedor</label>
                                <select
                                    className="input-field"
                                    value={newFornecedor.documento_tipo}
                                    onChange={(e) => setNewFornecedor({ ...newFornecedor, documento_tipo: e.target.value, documento_numero: '' })}
                                >
                                    <option value="cpf">Pessoa Física (CPF)</option>
                                    <option value="cnpj">Empresa (CNPJ)</option>
                                </select>
                            </div>

                            <Input
                                label={newFornecedor.documento_tipo === 'cpf' ? "Nome Completo" : "Nome da Empresa"}
                                value={newFornecedor.nome}
                                onChange={(e) => setNewFornecedor({ ...newFornecedor, nome: e.target.value })}
                                required
                            />

                            <Input
                                label={newFornecedor.documento_tipo === 'cpf' ? "CPF" : "CNPJ"}
                                placeholder={newFornecedor.documento_tipo === 'cpf' ? "000.000.000-00" : "00.000.000/0000-00"}
                                value={newFornecedor.documento_numero}
                                onChange={(e) => {
                                    const val = e.target.value
                                    const formatted = newFornecedor.documento_tipo === 'cpf' ? formatCPF(val) : formatCNPJ(val)
                                    setNewFornecedor({ ...newFornecedor, documento_numero: formatted })
                                }}
                                required
                            />

                            {duplicateError && <div className="error-message" style={{ color: 'var(--error)', fontSize: '0.8rem', marginBottom: '10px' }}>{duplicateError}</div>}
                            <div className="form-group">
                                <label>Subcategoria</label>
                                <select
                                    className="input-field"
                                    value={newFornecedor.subcategoria}
                                    onChange={(e) => setNewFornecedor({ ...newFornecedor, subcategoria: e.target.value })}
                                >
                                    <option value="prestador_servico">Prestador de Serviço</option>
                                    <option value="materiais">Materiais</option>
                                    <option value="locacao_equipe">Locação de Equipe</option>
                                </select>
                            </div>
                            <Input
                                label="Função/Cargo"
                                value={newFornecedor.funcao}
                                onChange={(e) => setNewFornecedor({ ...newFornecedor, funcao: e.target.value })}
                                required={newFornecedor.subcategoria === 'prestador_servico'}
                                placeholder={newFornecedor.subcategoria === 'prestador_servico' ? "Obrigatório" : "Opcional"}
                            />
                            <Input
                                label="Contato (Tel/Zap)"
                                value={newFornecedor.contato}
                                onChange={(e) => setNewFornecedor({ ...newFornecedor, contato: e.target.value })}
                            />
                        </div>
                        <div className="form-actions" style={{ marginTop: '1rem' }}>
                            <Button type="button" variant="secondary" onClick={() => {
                                setShowForm(false)
                                setIsEditing(false)
                            }}>Cancelar</Button>
                            <Button type="submit" loading={isSaving} disabled={isSaving}>
                                {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="fornecedores-grid print-hide">
                {loading ? (
                    <p>Carregando...</p>
                ) : (fornecedores || []).length === 0 ? (
                    <Card className="empty-state">
                        <p>Nenhum fornecedor cadastrado.</p>
                    </Card>
                ) : (
                    fornecedores
                        .filter(w => filterObra === 'all' || w.id_obra === filterObra || w.obra_id === filterObra)
                        .map(fornecedor => {
                            const costs = calculateTotals(fornecedor.id)
                            return (
                                <Card key={fornecedor.id} className="fornecedor-card">
                                    <div className="fornecedor-content">
                                        <div className="fornecedor-avatar">
                                            <User size={24} />
                                        </div>
                                        <div className="fornecedor-info">
                                            <h3>{fornecedor.nome}</h3>
                                            <div className="fornecedor-meta">
                                                <span className="detail-item"><Briefcase size={12} /> {fornecedor.funcao}</span>
                                                <span className="detail-item"><Phone size={12} /> {fornecedor.contato || 'N/A'}</span>
                                                <span className="detail-item" style={{ opacity: 0.7 }}>
                                                    {fornecedor.documento_tipo?.toUpperCase()}: {
                                                        fornecedor.documento_tipo === 'cpf' ? formatCPF(fornecedor.documento_numero || '') : formatCNPJ(fornecedor.documento_numero || '')
                                                    }
                                                </span>
                                            </div>
                                            <div className="fornecedor-meta">
                                                <span className="badge info">{
                                                    fornecedor.subcategoria === 'prestador_servico' ? 'Prestador' :
                                                        fornecedor.subcategoria === 'materiais' ? 'Materiais' :
                                                            fornecedor.subcategoria === 'locacao_equipe' ? 'Locação' : 'Prestador'
                                                }</span>
                                            </div>
                                            <div className="fornecedor-obra-tag">
                                                {fornecedor.obras?.nome}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="fornecedor-stats">
                                        <div className="stat-mini total">
                                            <span className="label">DESPESA TOTAL</span>
                                            <span className="value">R$ {costs.total.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {isAdmin ? (
                                        <div className="fornecedor-actions">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => openPaymentModal(fornecedor)}
                                                title="Registrar Pagamento"
                                            >
                                                <DollarSign size={16} />
                                                Pagar
                                            </Button>
                                            <Button variant="ghost" title="Histórico">
                                                <History size={16} />
                                            </Button>
                                            <Button variant="ghost" onClick={() => handleEdit(fornecedor)} title="Editar">
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button variant="ghost" onClick={() => handleDelete(fornecedor.id)} title="Excluir" style={{ color: 'var(--error)' }}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="fornecedor-actions" style={{ justifyContent: 'center' }}>
                                            <Button variant="ghost" title="Histórico">
                                                <History size={16} style={{ marginRight: '6px' }} /> Histórico
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )
                        })
                )}
            </div>

            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title={`Registrar Pagamento: ${selectedFornecedor?.nome}`}
            >
                <form onSubmit={handleRegisterPayment}>
                    <Input
                        label="Valor do Pagamento (R$)"
                        type="number"
                        step="0.01"
                        value={paymentData.valor}
                        onChange={(e) => setPaymentData({ ...paymentData, valor: e.target.value })}
                        required
                        placeholder="Ex: 1500,00"
                    />
                    <div className="input-group">
                        <label className="input-label">Referente a</label>
                        <select
                            className="input-field"
                            value={paymentData.referente}
                            onChange={(e) => setPaymentData({ ...paymentData, referente: e.target.value })}
                            required
                        >
                            <option value="Honorários">Honorários</option>
                            <option value="Reembolso de Materiais">Reembolso de Materiais</option>
                            <option value="Vale/Adiantamento">Vale/Adiantamento</option>
                            <option value="Combustível">Combustível</option>
                            <option value="Serviço Extra">Serviço Extra</option>
                        </select>
                    </div>
                    <Input
                        label="Data do Pagamento"
                        type="date"
                        value={paymentData.data}
                        onChange={(e) => setPaymentData({ ...paymentData, data: e.target.value })}
                        required
                    />
                    <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={paymentLoading} disabled={paymentLoading}>
                            Confirmar Pagamento
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                title="Comprovante de Pagamento"
                className="modal-receipt print-hide"
            >
                {lastPayment && (
                    <div className="receipt-view">
                        <div className="receipt-body">
                            <div className="owner-section">
                                <div className="label">Pagador (Proprietário):</div>
                                <h4>{ownerData?.proprietario_nome || 'Não cadastrado'}</h4>
                                <div className="doc">{ownerData?.proprietario_documento}</div>
                            </div>

                            <p className="receipt-text">
                                Recebemos de <strong>{ownerData?.proprietario_nome || 'o proprietário'}</strong>, o valor de:
                            </p>

                            <div className="receipt-amount highlight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastPayment.valor)}
                            </div>

                            <div className="receipt-details">
                                <div className="detail-row">
                                    <span>Fornecedor:</span>
                                    <span>{lastPayment.fornecedor_nome}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Referente a:</span>
                                    <span className="ref-val">{lastPayment.referente || 'Honorários'}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Data:</span>
                                    <span>{new Date(lastPayment.data_pagamento).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions flex gap-4 mt-8">
                            <button
                                className="btn-secondary flex-1"
                                onClick={handlePrint}
                            >
                                <Printer size={18} className="mr-2" />
                                Gerar PDF / Imprimir
                            </button>
                            <button
                                className="whatsapp-btn btn-primary flex-1"
                                onClick={() => handleShareWhatsApp(lastPayment)}
                            >
                                <Share2 size={18} className="mr-2" />
                                Enviar WhatsApp
                            </button>
                        </div>

                    </div>
                )}
            </Modal>

            <Modal
                isOpen={duplicateModal.open}
                onClose={() => setDuplicateModal({ ...duplicateModal, open: false })}
                title="Documento Duplicado"
            >
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ color: 'var(--error)', marginBottom: '15px' }}>
                        <AlertCircle size={48} style={{ margin: '0 auto' }} />
                    </div>
                    <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                        O documento <strong>{duplicateModal.doc}</strong> já está cadastrado no sistema.
                    </p>
                    <p style={{ opacity: 0.8, marginBottom: '20px' }}>
                        Fornecedor vinculado: <strong>{duplicateModal.name}</strong>
                    </p>
                    <Button
                        onClick={() => setDuplicateModal({ ...duplicateModal, open: false })}
                        style={{ width: '100%' }}
                    >
                        Entendido, fechar
                    </Button>
                </div>
            </Modal>

            {showReceiptModal && lastPayment && createPortal(
                <div className="printable-portal-root">
                    <div className="printable">
                        <div className="receipt-header">
                            <div className="receipt-logo">FUTURA</div>
                            <div className="receipt-tag">RECIBO DE PAGAMENTO - FORNECEDOR</div>
                            <div className="receipt-tag" style={{ border: 'none', background: 'none' }}># {Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</div>
                        </div>

                        <div className="receipt-body">
                            <div className="owner-section">
                                <div className="label">PAGADOR (PROPRIETÁRIO):</div>
                                <h4>{ownerData?.proprietario_nome || 'NÃO CADASTRADO'}</h4>
                                <div className="doc">{ownerData?.proprietario_documento}</div>
                                <div className="doc">{ownerData?.proprietario_contato}</div>
                            </div>

                            <p className="receipt-text" style={{ fontSize: '13pt', margin: '15px 0' }}>
                                Recebemos de <strong>{ownerData?.proprietario_nome || 'Futura Solução'}</strong>, a importância de:
                            </p>

                            <div className="receipt-amount highlight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastPayment.valor)}
                            </div>

                            <div className="receipt-details" style={{ marginTop: '15px' }}>
                                <div className="detail-row" style={{ padding: '1pt 0' }}>
                                    <span>REFERENTE A:</span>
                                    <strong style={{ fontSize: '13pt' }}>{lastPayment.referente?.toUpperCase() || 'HONORÁRIOS'}</strong>
                                </div>
                                <div className="detail-row" style={{ padding: '1pt 0' }}>
                                    <span>FORNECEDOR:</span>
                                    <span>{lastPayment.fornecedor_nome?.toUpperCase()}</span>
                                </div>
                                <div className="detail-row" style={{ padding: '1pt 0' }}>
                                    <span>DATA DO PAGAMENTO:</span>
                                    <span>
                                        {lastPayment.data_pagamento.includes('-')
                                            ? lastPayment.data_pagamento.split('-').reverse().join('/')
                                            : new Date(lastPayment.data_pagamento).toLocaleDateString('pt-BR')
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="receipt-footer">
                            <div style={{ borderTop: '1px solid black', width: '250px', margin: '0 auto', paddingTop: '5px' }}>
                                Assinatura do Profissional
                            </div>
                            <p style={{ marginTop: '20px', fontSize: '10pt', opacity: 0.8 }}>
                                Gerado por Futura Gerenciamento de Obras em {new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
