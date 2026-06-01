import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Save, User, FileText, Phone, Edit2, CheckCircle, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Configuracoes.css'

export const Configuracoes = ({ onTabChange }) => {
    const { signOut } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [ownerData, setOwnerData] = useState({
        proprietario_nome: '',
        proprietario_documento: '',
        proprietario_contato: ''
    })

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('configuracoes').select('*').single()
            if (data) {
                setOwnerData({
                    proprietario_nome: data.proprietario_nome || '',
                    proprietario_documento: data.proprietario_documento || '',
                    proprietario_contato: data.proprietario_contato || ''
                })
                setIsEditing(false)
            } else {
                setIsEditing(true)
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error)
            setIsEditing(true)
        }
        setLoading(false)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            // Use upsert to handle both insert and update
            const { error } = await supabase
                .from('configuracoes')
                .upsert({
                    id: 1, // Assume a single record with ID 1 for simplicity of this logic
                    proprietario_nome: ownerData.proprietario_nome,
                    proprietario_documento: ownerData.proprietario_documento,
                    proprietario_contato: ownerData.proprietario_contato,
                    updated_at: new Date()
                }, { onConflict: 'id' })

            if (error) throw error

            setSuccess(true)
            setIsEditing(false)

            // Auto navigate to home after 1.5s
            setTimeout(() => {
                if (onTabChange) onTabChange('dashboard')
            }, 1500)

        } catch (error) {
            console.error('Erro ao salvar:', error)
            alert('Falha ao salvar configurações. Verifique a tabela no Supabase.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="loading-state">Carregando configurações...</div>

    return (
        <div className="config-container">
            <header className="page-header">
                <h1>Ajustes</h1>
                <p>Dados do proprietário e preferências do sistema</p>
            </header>

            {success && (
                <div className="success-toast animate-in">
                    <CheckCircle size={20} />
                    <span>Configurações salvas! Voltando para o início...</span>
                </div>
            )}

            <Card className="form-card animate-in">
                <div className="section-header">
                    <User size={20} className="icon" />
                    <h2>Dados do Proprietário</h2>
                </div>
                <p className="section-desc">Essas informações aparecerão nos recibos e documentos gerados pelo sistema.</p>

                {!isEditing ? (
                    <div className="readonly-view">
                        <div className="data-item">
                            <label>Nome / Razão Social</label>
                            <p>{ownerData.proprietario_nome || 'Não preenchido'}</p>
                        </div>
                        <div className="data-item">
                            <label>CPF / CNPJ</label>
                            <p>{ownerData.proprietario_documento || 'Não preenchido'}</p>
                        </div>
                        <div className="data-item">
                            <label>Contato</label>
                            <p>{ownerData.proprietario_contato || 'Não preenchido'}</p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setIsEditing(true)}
                            style={{ marginTop: '1.5rem', width: '100%' }}
                        >
                            <Edit2 size={18} />
                            Editar Meus Dados
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="form-grid">
                            <Input
                                label="Nome Completo ou Razão Social"
                                placeholder="Ex: João Silva ou Futura Obras LTDA"
                                value={ownerData.proprietario_nome}
                                onChange={(e) => setOwnerData({ ...ownerData, proprietario_nome: e.target.value })}
                                required
                            />
                            <Input
                                label="CPF ou CNPJ"
                                placeholder="000.000.000-00"
                                value={ownerData.proprietario_documento}
                                onChange={(e) => setOwnerData({ ...ownerData, proprietario_documento: e.target.value })}
                            />
                            <Input
                                label="Telefone de Contato"
                                placeholder="(00) 00000-0000"
                                value={ownerData.proprietario_contato}
                                onChange={(e) => setOwnerData({ ...ownerData, proprietario_contato: e.target.value })}
                            />
                        </div>

                        <div className="form-actions" style={{ marginTop: '2rem' }}>
                            <Button type="submit" loading={saving} disabled={saving}>
                                <Save size={18} />
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                )}
            </Card>

            <div className="info-box">
                <FileText size={20} />
                <div>
                    <h4>Recibos Digitais</h4>
                    <p>Após registrar o pagamento de um fornecedor na aba "Fornecedores", você pode gerar um recibo profissional em PDF com a sua marca.</p>
                </div>
            </div>

            <Card className="form-card animate-in" style={{ marginTop: '1.5rem', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="section-header" style={{ color: 'var(--error)' }}>
                    <LogOut size={20} className="icon" />
                    <h2>Sair do Sistema</h2>
                </div>
                <p className="section-desc">Desconectar sua conta com segurança deste dispositivo.</p>
                <Button 
                    onClick={signOut} 
                    style={{ backgroundColor: 'var(--error)', color: 'white', width: '100%', marginTop: '1rem' }}
                >
                    Sair da Conta
                </Button>
            </Card>
        </div>
    )
}
