import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ArrowUpCircle, Plus, X, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase'

const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const TransactionForm = ({
    initialType = 'despesa',
    initialData = null,
    obras = [],
    fornecedores = [],
    onSave,
    onCancel
}) => {
    const [formType, setFormType] = useState(initialType)
    const [formData, setFormData] = useState({
        obra_id: '',
        fornecedor_id: '',
        categoria: 'material',
        valor: '',
        data: getLocalDateStr(),
        vencimento: getLocalDateStr(),
        status: 'pendente',
        observacoes: '',
        is_previsao: false,
        etapa_id: ''
    })
    const [etapas, setEtapas] = useState([])
    const [loadingEtapas, setLoadingEtapas] = useState(false)

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                observacoes: initialData.type === 'entrada' ? (initialData.descricao || '') : (initialData.observacoes || ''),
                is_previsao: initialData.is_previsao || false
            })
            setFormType(initialData.type || 'despesa')
        }
    }, [initialData])

    useEffect(() => {
        if (formData.obra_id && formType === 'despesa') {
            fetchEtapas(formData.obra_id)
        } else {
            setEtapas([])
        }
    }, [formData.obra_id, formType])

    const fetchEtapas = async (obraId) => {
        setLoadingEtapas(true)
        try {
            const { data, error } = await supabase
                .from('orcamento_etapas')
                .select('id, nome_etapa')
                .eq('obra_id', obraId)
                .order('nome_etapa')
            if (error) throw error
            setEtapas(data || [])
        } catch (error) {
            console.error("Erro ao buscar etapas:", error)
        } finally {
            setLoadingEtapas(false)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        // Auto-status logic
        const status = formData.vencimento >= formData.data ? 'pendente' : 'pago'

        const payload = formType === 'despesa'
            ? {
                obra_id: formData.obra_id,
                fornecedor_id: formData.fornecedor_id || null,
                categoria: formData.categoria,
                valor: formData.valor,
                data: formData.data,
                vencimento: formData.vencimento,
                status: status,
                observacoes: formData.observacoes,
                is_previsao: formData.is_previsao,
                ...(formData.etapa_id ? { etapa_id: formData.etapa_id } : {})
            }
            : {
                obra_id: formData.obra_id,
                valor: formData.valor,
                data: formData.data,
                descricao: formData.observacoes || 'Aporte de capital'
            }

        onSave(payload, formType)
    }

    return (
        <Card className="form-card animate-in modal-style">
            <div className="form-header">
                <h2>{initialData ? 'Editar' : (formType === 'despesa' ? 'Despesas' : 'Registrar Entrada')}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`form-badge ${formType}`}>{formType}</span>
                    <button type="button" onClick={onCancel} className="close-btn"><X size={20} /></button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {!initialData && (
                    <div className="form-type-toggle" style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
                        <Button
                            type="button"
                            variant={formType === 'entrada' ? 'primary' : 'secondary'}
                            onClick={() => setFormType('entrada')}
                            size="sm"
                        >
                            <ArrowUpCircle size={16} /> Entrada
                        </Button>
                        <Button
                            type="button"
                            variant={formType === 'despesa' ? 'primary' : 'secondary'}
                            onClick={() => setFormType('despesa')}
                            size="sm"
                        >
                            <Plus size={16} /> Despesa
                        </Button>
                    </div>
                )}

                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Obra</label>
                        <select
                            className="input-field"
                            value={formData.obra_id}
                            onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione uma obra</option>
                            {obras.map(obra => (
                                <option key={obra.id} value={obra.id}>{obra.nome}</option>
                            ))}
                        </select>
                    </div>

                    {formType === 'despesa' && (
                        <>
                            <div className="input-group">
                                <label className="input-label">Categoria</label>
                                <select
                                    className="input-field"
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    required
                                >
                                    <option value="material">Material</option>
                                    <option value="mao_de_obra">Prestação de Serviço</option>
                                    <option value="equipamentos">Equipamentos</option>
                                    <option value="outros">Outros</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Fornecedor (Opcional)</label>
                                <select
                                    className="input-field"
                                    value={formData.fornecedor_id}
                                    onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                                >
                                    <option value="">Nenhum/Geral</option>
                                    {fornecedores.filter(t => !formData.obra_id || t.obra_id === formData.obra_id).map(t => (
                                        <option key={t.id} value={t.id}>{t.nome} ({t.funcao})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Etapa da Obra (Opcional)</label>
                                <select
                                    className="input-field"
                                    value={formData.etapa_id}
                                    onChange={(e) => setFormData({ ...formData, etapa_id: e.target.value })}
                                    disabled={loadingEtapas}
                                >
                                    <option value="">Geral / Sem Etapa</option>
                                    {etapas.map(etapa => (
                                        <option key={etapa.id} value={etapa.id}>{etapa.nome_etapa}</option>
                                    ))}
                                </select>
                                {etapas.length === 0 && formData.obra_id && !loadingEtapas && (
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Nenhuma etapa cadastrada para esta obra.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <Input
                        label="Valor"
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        required
                    />
                    <Input
                        label="Data"
                        type="date"
                        value={formData.data}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, data: val, vencimento: val })
                        }}
                        required
                    />
                    {formType === 'despesa' && (
                        <>
                            <Input
                                label="Vencimento"
                                type="date"
                                value={formData.vencimento}
                                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                                required
                            />

                            <div className="input-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                                <input
                                    type="checkbox"
                                    id="is_previsao"
                                    checked={formData.is_previsao}
                                    onChange={(e) => setFormData({ ...formData, is_previsao: e.target.checked })}
                                />
                                <label htmlFor="is_previsao" className="input-label" style={{ marginBottom: 0 }}>Marcar como Previsão</label>
                            </div>
                        </>
                    )}
                </div>

                <Input
                    label={formType === 'despesa' ? 'Observações' : 'Descrição da Entrada'}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder={formType === 'despesa' ? 'Ex: Compra de cimento' : 'Ex: Aporte do cliente'}
                />

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit">{initialData ? 'Salvar Alterações' : (formType === 'despesa' ? 'Incluir' : 'Registrar')}</Button>
                </div>
            </form>
        </Card>
    )
}
