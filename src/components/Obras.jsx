import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Plus, MapPin, Calculator, Calendar, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Obras.css'

export const Obras = () => {
    const { isAdmin } = useAuth()
    const [obras, setObras] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [newObra, setNewObra] = useState({ nome: '', localizacao: '', orcamento_total: '' })

    useEffect(() => {
        fetchObras()
    }, [])

    const fetchObras = async () => {
        const { data, error } = await supabase
            .from('obras')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setObras(data)
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase.from('obras').insert([
            { ...newObra, user_id: user.id }
        ])

        if (!error) {
            setNewObra({ nome: '', localizacao: '', orcamento_total: '' })
            setShowForm(false)
            fetchObras()
        }
    }

    const deleteObra = async (id) => {
        if (confirm('Deseja excluir esta obra?')) {
            await supabase.from('obras').delete().eq('id', id)
            fetchObras()
        }
    }

    return (
        <div className="obras-container">
            <header className="page-header with-action">
                <div>
                    <h1>Obras</h1>
                    <p>Gerencie seus projetos ativos</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus size={18} />
                        Novo
                    </Button>
                )}
            </header>

            {showForm && isAdmin && (
                <Card className="form-card animate-in">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <Input
                                label="Nome da Obra"
                                value={newObra.nome}
                                onChange={(e) => setNewObra({ ...newObra, nome: e.target.value })}
                                required
                            />
                            <Input
                                label="Localização"
                                value={newObra.localizacao}
                                onChange={(e) => setNewObra({ ...newObra, localizacao: e.target.value })}
                            />
                            <Input
                                label="Orçamento Estimado"
                                type="number"
                                value={newObra.orcamento_total}
                                onChange={(e) => setNewObra({ ...newObra, orcamento_total: e.target.value })}
                            />
                        </div>
                        <div className="form-actions">
                            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit">Salvar Obra</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="obras-grid">
                {loading ? (
                    <p>Carregando...</p>
                ) : obras.length === 0 ? (
                    <Card className="empty-state">
                        <p>Nenhuma obra cadastrada ainda.</p>
                    </Card>
                ) : (
                    obras.map(obra => (
                        <Card key={obra.id} className="obra-card">
                            <div className="obra-card-content">
                                <h3>{obra.nome}</h3>
                                <div className="obra-details">
                                    <span className="detail-item">
                                        <MapPin size={14} /> {obra.localizacao || 'Sem local'}
                                    </span>
                                    <span className="detail-item">
                                        <Calculator size={14} /> R$ {parseFloat(obra.orcamento_total).toLocaleString()}
                                    </span>
                                    <span className="detail-item">
                                        <Calendar size={14} /> {new Date(obra.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="obra-card-actions">
                                    <Button variant="ghost" onClick={() => deleteObra(obra.id)}>
                                        <Trash2 size={16} color="var(--error)" />
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
