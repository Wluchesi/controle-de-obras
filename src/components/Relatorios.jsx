import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar
} from 'recharts'
import {
    TrendingUp, AlertCircle, CheckCircle2,
    Download, DollarSign, Users, Briefcase, Calendar, BarChart3, HardHat, List, FileText
} from 'lucide-react'
import { Button } from './ui/Button'
import './Relatorios.css'

export const Relatorios = () => {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('health')
    const [reportMode, setReportMode] = useState('visual') // 'visual' or 'analytic'
    const [selectedObra, setSelectedObra] = useState('all')
    const [obrasList, setObrasList] = useState([])
    const [rawData, setRawData] = useState({ despesas: [], entradas: [], obras: [], fornecedores: [], orcamentoEtapas: [] })
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const [data, setData] = useState({
        porCategoria: [],
        fluxoMensal: [],
        fluxoStatus: [],
        porObra: [],
        porFornecedor: [],
        totalOrcado: 0,
        totalGasto: 0,
        totalRecebido: 0,
        totalAtrasado: 0,
        countAtrasado: 0,
        totalAVencer: 0,
        countAVencer: 0,
        countPago: 0,
        orcamentoPorEtapa: [],
        orcamentoPorInsumo: [],
        despesasDetalhadas: [],
        entradasDetalhadas: []
    })

    useEffect(() => {
        fetchAnalytics()
    }, [])

    useEffect(() => {
        if (!rawData.obras.length && !rawData.despesas.length) return
        calculateAnalytics()
    }, [selectedObra, rawData])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const [obrasRes, despesasRes, entradasRes, fornecedoresRes, orcEtapasRes] = await Promise.all([
                supabase.from('obras').select('*'),
                supabase.from('despesas').select('*, obras(nome), fornecedores(nome)'),
                supabase.from('entradas').select('*, obras(nome)'),
                supabase.from('fornecedores').select('*'),
                supabase.from('orcamento_etapas').select('*')
            ])

            setRawData({
                despesas: despesasRes.data || [],
                entradas: entradasRes.data || [],
                obras: obrasRes.data || [],
                fornecedores: fornecedoresRes.data || [],
                orcamentoEtapas: orcEtapasRes.data || []
            })
            setObrasList(obrasRes.data || [])
        } catch (error) {
            console.error("Erro ao carregar relatórios:", error)
        }
        setLoading(false)
    }

    const calculateAnalytics = () => {
        const { despesas: allDespesas, entradas: allEntradas, obras: allObras, fornecedores: allFornecedores } = rawData

        // Filter by Obra
        const despesas = selectedObra === 'all' ? allDespesas : allDespesas.filter(d => d.obra_id === selectedObra)
        const entradas = selectedObra === 'all' ? allEntradas : allEntradas.filter(e => e.obra_id === selectedObra)
        const obras = selectedObra === 'all' ? allObras : allObras.filter(o => o.id === selectedObra)
        const fornecedores = selectedObra === 'all' ? allFornecedores : allFornecedores.filter(f => !selectedObra || f.obra_id === selectedObra)

        // 1. Por Categoria (Despesas)
        const cats = despesas.filter(d => d.status === 'pago').reduce((acc, curr) => {
            const rawCat = curr.categoria || 'outros'
            const catName = rawCat === 'mao_de_obra' || rawCat === 'Mão de Obra'
                ? 'Prestação de Serviço'
                : rawCat.charAt(0).toUpperCase() + rawCat.slice(1).replace('_', ' ');
            acc[catName] = (acc[catName] || 0) + Number(curr.valor || 0)
            return acc
        }, {})
        const porCategoria = Object.keys(cats).map(name => ({ name, value: cats[name] }))

        // 2. Fluxo Mensal Status (Empilhado)
        const mesesStatus = {}

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()
            mesesStatus[key] = { label, pago: 0, pendente: 0, vencido: 0, sortKey: key }
        }

        // Process expenses by status and month
        despesas.forEach(d => {
            const dateStr = d.data || d.vencimento
            if (!dateStr) return
            const date = new Date(dateStr)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (mesesStatus[key]) {
                const val = Number(d.valor || 0)
                if (d.status === 'pago') {
                    mesesStatus[key].pago += val
                } else {
                    const isVencido = d.vencimento && d.vencimento < todayStr
                    if (isVencido) {
                        mesesStatus[key].vencido += val
                    } else {
                        mesesStatus[key].pendente += val
                    }
                }
            }
        })

        const fluxoStatus = Object.values(mesesStatus).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

        // Original Fluxo Mensal (remain for summary)
        const meses = {}
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            meses[key] = { name: label, entradas: 0, saidas: 0, sortKey: key }
        }
        despesas.filter(d => d.status === 'pago').forEach(d => {
            const dateStr = d.data || d.vencimento
            if (!dateStr) return
            const date = new Date(dateStr)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (meses[key]) meses[key].saidas += Number(d.valor || 0)
        })
        entradas.forEach(e => {
            const dateStr = e.data
            if (!dateStr) return
            const date = new Date(dateStr)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (meses[key]) meses[key].entradas += Number(e.valor || 0)
        })
        const fluxoMensal = Object.values(meses).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

        // 3. Por Obra (Rentabilidade)
        const obrasStats = obras.map(o => {
            const exp = despesas.filter(d => d.obra_id === o.id && d.status === 'pago').reduce((sum, d) => sum + Number(d.valor), 0)
            const inc = entradas.filter(e => e.obra_id === o.id).reduce((sum, e) => sum + Number(e.valor), 0)
            return {
                name: o.nome,
                entradas: inc,
                saidas: exp,
                saldo: inc - exp
            }
        })

        // 4. Por Fornecedor
        const fornecedorStats = fornecedores.map(t => {
            const total = despesas.filter(d => d.fornecedor_id === t.id).reduce((sum, d) => sum + Number(d.valor), 0)
            return { name: t.nome, valor: total, funcao: t.funcao }
        }).filter(w => w.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 5)

        // 5. Orçamento Detalhado
        const orcEtapasRaw = (selectedObra === 'all' ? rawData.orcamentoEtapas : rawData.orcamentoEtapas.filter(o => o.obra_id === selectedObra)) || []

        // Agrupar despesas por etapa para o "Realizado"
        const despesasPorEtapaMap = despesas.reduce((acc, curr) => {
            const eid = curr.etapa_id || 'geral'
            acc[eid] = (acc[eid] || 0) + Number(curr.valor || 0)
            return acc
        }, {})

        let orcamentoPorEtapa = []
        let orcamentoPorInsumo = []

        if (orcEtapasRaw.length > 0) {
            orcamentoPorEtapa = orcEtapasRaw.map(etapa => ({
                name: etapa.nome_etapa,
                planejado: Number(etapa.valor_planejado || 0),
                realizado: despesasPorEtapaMap[etapa.id] || 0
            })).sort((a, b) => b.planejado - a.planejado)

            const insumos = orcEtapasRaw.reduce((acc, curr) => {
                const cat = curr.categoria || 'outros'
                acc[cat] = (acc[cat] || 0) + Number(curr.valor_planejado || 0)
                return acc
            }, {})
            orcamentoPorInsumo = [
                { name: 'Mão-de-obra', valor: insumos['mao_de_obra'] || 0, color: '#2563eb' },
                { name: 'Material', valor: insumos['material'] || 0, color: '#22c55e' },
                { name: 'Equipamento', valor: insumos['equipamentos'] || 0, color: '#f59e0b' },
                { name: 'Serviço', valor: insumos['servico'] || 0, color: '#38bdf8' },
                { name: 'Taxa', valor: insumos['taxa'] || 0, color: '#ef4444' }
            ]
        } else {
            // Fallback: Se não houver etapas, mostra o total da obra como uma etapa "Geral"
            const totalOrcadoObra = obras.reduce((acc, curr) => acc + Number(curr.orcamento_total || 0), 0)
            const totalRealizadoObra = despesas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0)

            orcamentoPorEtapa = [{
                name: 'Geral (Sem etapas)',
                planejado: totalOrcadoObra,
                realizado: totalRealizadoObra
            }]

            // Mockup por categoria baseado no total orçado (proporcional ou apenas o total em Material)
            orcamentoPorInsumo = [
                { name: 'Orcamento Total', valor: totalOrcadoObra, color: 'var(--accent)' }
            ]
        }

        setData({
            porCategoria,
            fluxoMensal,
            fluxoStatus,
            porObra: obrasStats,
            porFornecedor: fornecedorStats,
            totalOrcado: obras.reduce((acc, curr) => acc + Number(curr.orcamento_total || 0), 0),
            totalGasto: despesas.filter(d => d.status === 'pago').reduce((acc, curr) => acc + Number(curr.valor || 0), 0),
            totalRecebido: entradas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0),
            totalAtrasado: despesas.filter(d => d.status === 'pendente' && d.vencimento && d.vencimento < todayStr).reduce((acc, curr) => acc + Number(curr.valor || 0), 0),
            countAtrasado: despesas.filter(d => d.status === 'pendente' && d.vencimento && d.vencimento < todayStr).length,
            totalAVencer: despesas.filter(d => d.status === 'pendente' && (d.vencimento >= todayStr || !d.vencimento)).reduce((acc, curr) => acc + Number(curr.valor || 0), 0),
            countAVencer: despesas.filter(d => d.status === 'pendente' && (d.vencimento >= todayStr || !d.vencimento)).length,
            countPago: despesas.filter(d => d.status === 'pago').length,
            orcamentoPorEtapa,
            orcamentoPorInsumo,
            despesasDetalhadas: [...despesas].sort((a, b) => new Date(b.data || b.vencimento || 0) - new Date(a.data || a.vencimento || 0)),
            entradasDetalhadas: [...entradas].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
        })
    }

    const COLORS = ['#2563eb', '#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

    const handlePrint = () => {
        // Delay ensures charts are fully settled in the DOM before opening the print dialog
        setTimeout(() => {
            window.print()
        }, 500)
    }

    const handleExportExcel = () => {
        const { despesasDetalhadas, entradasDetalhadas } = data;

        // Prepare Expenses Sheet
        const despesasData = despesasDetalhadas.map(d => {
            // Tenta pegar do join, se falhar tenta buscar na lista de fornecedores carregada
            const fRef = d.fornecedores || rawData.fornecedores.find(f => f.id === d.fornecedor_id);
            const fornecedorNome = fRef
                ? `${fRef.nome}${fRef.funcao ? ` (${fRef.funcao})` : ''}`
                : (d.fornecedor_nome || '');

            return {
                Obra: d.obras?.nome || 'Geral',
                Data: d.data,
                Categoria: d.categoria,
                Fornecedor: fornecedorNome,
                Valor: Number(d.valor),
                Status: d.status,
                Vencimento: d.vencimento || '',
                Observações: d.observacoes || ''
            };
        });

        // Prepare Entradas Sheet
        const entradasData = entradasDetalhadas.map(e => ({
            Obra: e.obras?.nome || 'Geral',
            Data: e.data,
            Descrição: e.descricao || 'Aporte',
            Valor: Number(e.valor)
        }));

        // Prepare Contas a Pagar Sheet (Sorted by Due Date)
        const contasAPagarData = despesasDetalhadas
            .filter(d => d.status === 'pendente')
            .sort((a, b) => new Date(a.vencimento || '9999') - new Date(b.vencimento || '9999'))
            .map(d => ({
                'Obra': d.obras?.nome || 'Geral',
                'Vencimento': d.vencimento ? new Date(d.vencimento).toLocaleDateString('pt-BR') : 'Sem data',
                'Dias p/ Vence': d.vencimento ? Math.ceil((new Date(d.vencimento) - new Date(todayStr)) / (1000 * 60 * 60 * 24)) : '-',
                'Fornecedor': d.fornecedores?.nome || d.fornecedor_nome || '',
                'Categoria': d.categoria,
                'Valor': Number(d.valor),
                'Observações': d.observacoes || ''
            }));

        // Create Workbook
        const wb = XLSX.utils.book_new();

        const wsResumo = XLSX.utils.json_to_sheet([
            { Item: 'Total Orçado', Valor: data.totalOrcado },
            { Item: 'Total Recebido', Valor: data.totalRecebido },
            { Item: 'Total Gasto (Pago)', Valor: data.totalGasto },
            { Item: 'Total a Pagar', Valor: data.totalAVencer + data.totalAtrasado },
            { Item: 'Saldo em Caixa', Valor: data.totalRecebido - data.totalGasto }
        ]);
        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Financeiro");

        const wsContas = XLSX.utils.json_to_sheet(contasAPagarData);
        XLSX.utils.book_append_sheet(wb, wsContas, "Contas a Pagar");

        const wsDespesas = XLSX.utils.json_to_sheet(despesasData);
        XLSX.utils.book_append_sheet(wb, wsDespesas, "Todas as Despesas");

        const wsEntradas = XLSX.utils.json_to_sheet(entradasData);
        XLSX.utils.book_append_sheet(wb, wsEntradas, "Entradas (Aportes)");

        // Save File
        const fileName = `Relatorio_Futura_${selectedObra === 'all' ? 'Geral' : obrasList.find(o => o.id === selectedObra)?.nome}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }


    if (loading) return <div className="loading-state">Carregando relatórios...</div>

    return (
        <div className="relatorios-container">
            <header className="page-header print-hide">
                <div className="header-content">
                    <h1>Relatórios</h1>
                    <p>Análise consolidada de todas as obras</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="filter-item" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px' }}>
                        <Briefcase size={16} />
                        <select
                            className="filter-select"
                            value={selectedObra}
                            onChange={(e) => setSelectedObra(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '14px', marginLeft: '8px', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="all" style={{ background: '#0a0e17', color: 'white' }}>Todas as Obras</option>
                            {obrasList.map(obra => (
                                <option key={obra.id} value={obra.id} style={{ background: '#0a0e17', color: 'white' }}>{obra.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div className="report-mode-selector">
                        <button
                            className={`mode-btn ${reportMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setReportMode('visual')}
                            title="Visão Gráfica"
                        >
                            <BarChart3 size={18} />
                        </button>
                        <button
                            className={`mode-btn ${reportMode === 'analytic' ? 'active' : ''}`}
                            onClick={() => setReportMode('analytic')}
                            title="Extrato Analítico"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <Button variant="secondary" onClick={handleExportExcel} style={{ border: '1px solid #22c55e', color: '#22c55e' }}>
                        <FileText size={18} />
                        Excel
                    </Button>

                    <Button variant="secondary" onClick={handlePrint}>
                        <Download size={18} />
                        PDF
                    </Button>
                </div>
            </header>

            <nav className="report-tabs print-hide">
                <button
                    className={activeTab === 'health' ? 'active' : ''}
                    onClick={() => setActiveTab('health')}
                >
                    <BarChart3 size={16} /> Saúde Financeira
                </button>
                <button
                    className={activeTab === 'finance' ? 'active' : ''}
                    onClick={() => setActiveTab('finance')}
                >
                    <HardHat size={16} /> Obra
                </button>
                <button
                    className={activeTab === 'labor' ? 'active' : ''}
                    onClick={() => setActiveTab('labor')}
                >
                    <Users size={16} /> Fornecedores
                </button>
                <button
                    className={activeTab === 'budget' ? 'active' : ''}
                    onClick={() => setActiveTab('budget')}
                >
                    <Briefcase size={16} /> Orçamento
                </button>
                <button
                    className={activeTab === 'payables' ? 'active' : ''}
                    onClick={() => setActiveTab('payables')}
                >
                    <Calendar size={16} /> Contas a Pagar
                </button>
            </nav>

            <div className="reports-content print-hide">
                {reportMode === 'visual' ? (
                    <>
                        {activeTab === 'health' && (
                            <div className="health-dashboard animate-in">
                                <div className="health-summary-row">
                                    <div className="health-card total">
                                        <span className="label">Saldo Total</span>
                                        <div className="value-area">
                                            <span className={`value ${(data.totalRecebido - data.totalGasto) >= 0 ? 'success' : 'error'}`}>
                                                R$ {(data.totalRecebido - data.totalGasto).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="health-card vencido">
                                        <span className="label">Vencido</span>
                                        <div className="value-area">
                                            <span className="value">R$ {data.totalAtrasado.toLocaleString()}</span>
                                            <span className="count">{data.countAtrasado}</span>
                                        </div>
                                    </div>
                                    <div className="health-card a-vencer">
                                        <span className="label">A vencer</span>
                                        <div className="value-area">
                                            <span className="value">R$ {data.totalAVencer.toLocaleString()}</span>
                                            <span className="count">{data.countAVencer}</span>
                                        </div>
                                    </div>
                                    <div className="health-card recebido">
                                        <span className="label">Pago (Despesas)</span>
                                        <div className="value-area">
                                            <span className="value">R$ {data.totalGasto.toLocaleString()}</span>
                                            <span className="count">{data.countPago}</span>
                                        </div>
                                    </div>
                                </div>

                                <Card className="chart-card-full">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                        <h3>Status de Pagamentos Mensais</h3>
                                        <div className="chart-legend-custom">
                                            <span className="legend-item"><span className="dot vencido"></span> Vencido</span>
                                            <span className="legend-item"><span className="dot a-vencer"></span> Em Aberto</span>
                                            <span className="legend-item"><span className="dot pago"></span> Pago</span>
                                        </div>
                                    </div>

                                    <div className="chart-wrapper" style={{ height: '400px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.fluxoStatus} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <XAxis
                                                    dataKey="label"
                                                    stroke="var(--text-muted)"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    stroke="var(--text-muted)"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                                    formatter={(value) => `R$ ${Number(value).toLocaleString()}`}
                                                />
                                                <Bar dataKey="pago" name="Pago" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} barSize={40} />
                                                <Bar dataKey="pendente" name="A Vencer" stackId="a" fill="#fcd34d" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="vencido" name="Vencido" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card className="chart-card-full">
                                    <h3>Fluxo de Caixa Mensal (Entradas vs Saídas)</h3>
                                    <div className="chart-wrapper" style={{ height: '300px', marginTop: '20px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.fluxoMensal} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                                    formatter={(value) => `R$ ${Number(value).toLocaleString()}`}
                                                />
                                                <Bar dataKey="entradas" fill="#22c55e" name="Entradas" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        )}


                        {activeTab === 'finance' && (
                            <div className="charts-grid">
                                <Card className="chart-card">
                                    <h3>Distribuição por Categoria</h3>
                                    <div className="chart-wrapper">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie
                                                    data={data.porCategoria}
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {data.porCategoria.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => `R$ ${value.toLocaleString()}`}
                                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="percentage-list">
                                        {data.porCategoria.map((cat, idx) => {
                                            const total = data.porCategoria.reduce((sum, c) => sum + c.value, 0);
                                            const perc = ((cat.value / total) * 100).toFixed(1);
                                            return (
                                                <div key={idx} className="perc-item">
                                                    <div className="perc-label">
                                                        <div className="perc-dot" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                        <span>{cat.name}</span>
                                                    </div>
                                                    <span className="perc-value">{perc}%</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>

                                <Card className="chart-card">
                                    <h3>Rentabilidade por Obra</h3>
                                    <div className="chart-wrapper">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={data.porObra} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                                                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                                                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={100} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="entradas" fill="#22c55e" name="Recebido" radius={[0, 4, 4, 0]} />
                                                <Bar dataKey="saidas" fill="#ef4444" name="Gasto" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'labor' && (
                            <div className="charts-grid">
                                <Card className="chart-card">
                                    <h3>Maiores Gastos com Fornecedores</h3>
                                    <div className="chart-wrapper">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={data.porFornecedor}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                                                <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                />
                                                <Bar dataKey="valor" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Custo Total" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card className="table-card">
                                    <h3>Ranking de Custos</h3>
                                    <div className="simple-table">
                                        {data.porFornecedor.map((fornecedor, idx) => (
                                            <div key={idx} className="table-row">
                                                <div className="fornecedor-info-mini">
                                                    <span className="w-name">{fornecedor.name} ({fornecedor.funcao})</span>
                                                </div>
                                                <span className="w-value">R$ {fornecedor.valor.toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {data.porFornecedor.length === 0 && <p className="empty-msg">Nenhum dado de fornecedor disponível.</p>}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'payables' && (
                            <div className="payables-dashboard animate-in">
                                <div className="budget-summary-grid">
                                    <div className="summary-card">
                                        <span className="summary-label">Total Vencido</span>
                                        <span className="summary-value error">R$ {data.totalAtrasado.toLocaleString()}</span>
                                    </div>
                                    <div className="summary-card">
                                        <span className="summary-label">Total a Vencer</span>
                                        <span className="summary-value warning">R$ {data.totalAVencer.toLocaleString()}</span>
                                    </div>
                                    <div className="summary-card">
                                        <span className="summary-label">Total Pendente</span>
                                        <span className="summary-value" style={{ color: 'var(--text-main)' }}>R$ {(data.totalAVencer + data.totalAtrasado).toLocaleString()}</span>
                                    </div>
                                </div>

                                <Card className="chart-card-full">
                                    <div className="table-header">
                                        <h3>Cronograma de Vencimentos</h3>
                                        <span className="count-label">
                                            {data.despesasDetalhadas.filter(d => d.status === 'pendente').length} contas pendentes
                                        </span>
                                    </div>
                                    <div className="data-table-wrapper">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Vencimento</th>
                                                    <th>Obra</th>
                                                    <th>Fornecedor</th>
                                                    <th>Categoria</th>
                                                    <th className="col-value">Valor</th>
                                                    <th className="col-status">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.despesasDetalhadas
                                                    .filter(d => d.status === 'pendente')
                                                    .sort((a, b) => new Date(a.vencimento || '9999') - new Date(b.vencimento || '9999'))
                                                    .map((d, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: '800', color: (d.vencimento && d.vencimento < todayStr) ? 'var(--error)' : 'var(--text-main)' }}>
                                                                {d.vencimento ? new Date(d.vencimento).toLocaleDateString('pt-BR') : '-'}
                                                            </td>
                                                            <td>{d.obras?.nome || 'Geral'}</td>
                                                            <td>{d.fornecedores?.nome || d.fornecedor_nome || '-'}</td>
                                                            <td>{(d.categoria || '').replace('_', ' ')}</td>
                                                            <td className="col-value">R$ {Number(d.valor || 0).toLocaleString()}</td>
                                                            <td className="col-status">
                                                                <span className={`status-badge ${d.vencimento && d.vencimento < todayStr ? 'vencido' : 'pendente'}`}>
                                                                    {d.vencimento && d.vencimento < todayStr ? 'Vencido' : 'A Vencer'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {data.despesasDetalhadas.filter(d => d.status === 'pendente').length === 0 && (
                                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Nenhuma conta a pagar encontrada.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'budget' && (
                            <div className="budget-dashboard">
                                <div className="budget-summary-grid">
                                    <div className="summary-card">
                                        <span className="summary-label">ORÇADO</span>
                                        <span className="summary-value">R$ {data.totalOrcado.toLocaleString()}</span>
                                    </div>
                                    {data.orcamentoPorInsumo.map((insumo, idx) => (
                                        <div key={idx} className="summary-card">
                                            <span className="summary-label">{insumo.name}</span>
                                            <span className="summary-value" style={{ color: insumo.color }}>R$ {insumo.valor.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="budget-charts-grid">
                                    <Card className="chart-card">
                                        <h3>Comparativo por Etapa (Planejado vs Realizado)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={350}>
                                                <BarChart data={data.orcamentoPorEtapa} margin={{ bottom: 40 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                                    <XAxis
                                                        dataKey="name"
                                                        stroke="var(--text-muted)"
                                                        fontSize={10}
                                                        angle={-45}
                                                        textAnchor="end"
                                                        interval={0}
                                                    />
                                                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                        formatter={(value) => `R$ ${Number(value).toLocaleString()}`}
                                                    />
                                                    <Legend verticalAlign="top" height={36} />
                                                    <Bar dataKey="planejado" name="Planejado" fill="#334155" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="realizado" name="Realizado" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    <Card className="chart-card">
                                        <h3>Orçado por tipo de insumo</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={data.orcamentoPorInsumo}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                                                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                        formatter={(value) => `R$ ${Number(value).toLocaleString()}`}
                                                    />
                                                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                                        {data.orcamentoPorInsumo.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="analytic-tables-container animate-in">
                        <section className="analytic-section">
                            <div className="table-header">
                                <h3>Extrato Detalhado de Despesas</h3>
                                <span className="count-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {data.despesasDetalhadas.length} lançamentos encontrados
                                </span>
                            </div>
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="col-date">Data/Venc</th>
                                            <th>Obra</th>
                                            <th>Categoria</th>
                                            <th>Fornecedor</th>
                                            <th className="col-value">Valor</th>
                                            <th className="col-status">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.despesasDetalhadas.map((d, i) => (
                                            <tr key={i} className={i % 2 === 0 ? '' : 'row-zebra'}>
                                                <td>{new Date(d.data || d.vencimento).toLocaleDateString('pt-BR')}</td>
                                                <td>{d.obras?.nome || 'Geral'}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{(d.categoria || '').replace('_', ' ')}</td>
                                                <td>
                                                    {d.fornecedores?.nome
                                                        ? `${d.fornecedores.nome}${d.fornecedores.funcao ? ` (${d.fornecedores.funcao})` : ''}`
                                                        : (d.fornecedor_nome || '-')}
                                                </td>
                                                <td className="col-value">R$ {Number(d.valor || 0).toLocaleString()}</td>
                                                <td className="col-status">
                                                    <span className={`status-badge ${d.status}`}>
                                                        {d.status === 'pago' ? 'Pago' : (d.vencimento && d.vencimento < todayStr) ? 'Vencido' : 'Pendente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="analytic-section">
                            <div className="table-header">
                                <h3>Extrato Detalhado de Entradas</h3>
                                <span className="count-label" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {data.entradasDetalhadas.length} lançamentos encontrados
                                </span>
                            </div>
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="col-date">Data</th>
                                            <th>Obra</th>
                                            <th>Descrição/Origem</th>
                                            <th className="col-value">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.entradasDetalhadas.map((e, i) => (
                                            <tr key={i} className={i % 2 === 0 ? '' : 'row-zebra'}>
                                                <td>{new Date(e.data).toLocaleDateString('pt-BR')}</td>
                                                <td>{e.obras?.nome || 'Geral'}</td>
                                                <td>{e.descricao || 'Aporte Financeiro'}</td>
                                                <td className="col-value">R$ {Number(e.valor || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* PRINTABLE CONTENT - Improved static approach */}
            <div className="relatorios-printable-area print-only">
                <header className="page-header">
                    <div className="header-content">
                        <h1>Relatório {selectedObra === 'all' ? 'Consolidado' : obrasList.find(o => o.id === selectedObra)?.nome} - Futura</h1>
                        <p>Data de emissão: {new Date().toLocaleString('pt-BR')}</p>
                    </div>
                </header>

                <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', display: 'grid', gap: '20px' }}>
                    <div className="summary-card">
                        <span className="summary-label">Saldo Total</span>
                        <span className={`summary-value ${(data.totalRecebido - data.totalGasto) >= 0 ? 'success' : 'error'}`}>
                            R$ {(data.totalRecebido - data.totalGasto).toLocaleString()}
                        </span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Gastos Totais</span>
                        <span className="summary-value error">R$ {data.totalGasto.toLocaleString()}</span>
                    </div>
                </div>

                {reportMode === 'visual' ? (
                    <div className="charts-grid-full">
                        <div className="chart-card" style={{ marginTop: '30px' }}>
                            <h3 style={{ marginBottom: '20px' }}>Fluxo de Caixa Mensal</h3>
                            <div className="chart-wrapper" style={{ height: '300px', width: '100%' }}>
                                <BarChart width={650} height={300} data={data.fluxoStatus}>
                                    <XAxis dataKey="label" fontSize={11} stroke="#666" />
                                    <YAxis fontSize={11} stroke="#666" />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <Bar dataKey="pago" fill="#22c55e" name="Pago" isAnimationActive={false} />
                                    <Bar dataKey="pendente" fill="#fcd34d" name="A Vencer" isAnimationActive={false} />
                                    <Bar dataKey="vencido" fill="#f87171" name="Vencido" isAnimationActive={false} />
                                </BarChart>
                            </div>
                        </div>

                        <div className="chart-card" style={{ marginTop: '30px' }}>
                            <h3 style={{ marginBottom: '15px' }}>Distribuição por Categoria</h3>
                            <div className="percentage-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {data.porCategoria.map((cat, idx) => {
                                    const total = data.porCategoria.reduce((sum, c) => sum + c.value, 0);
                                    const perc = ((cat.value / total) * 100).toFixed(1);
                                    return (
                                        <div key={idx} className="perc-item" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                            <span style={{ fontSize: '0.875rem', color: '#666' }}>{cat.name}</span>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'black' }}>R$ {cat.value.toLocaleString()} ({perc}%)</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="chart-card" style={{ marginTop: '30px' }}>
                            <h3 style={{ marginBottom: '15px' }}>Ranking de Custos por Fornecedor</h3>
                            <div className="simple-table">
                                {data.porFornecedor.map((fornecedor, idx) => (
                                    <div key={idx} className="table-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                        <span style={{ color: 'black' }}>{fornecedor.name} ({fornecedor.funcao})</span>
                                        <span style={{ fontWeight: 'bold', color: 'black' }}>R$ {fornecedor.valor.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="analytic-tables-print">
                        <section className="analytic-section-print" style={{ marginTop: '30px' }}>
                            <h3 style={{ borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '15px' }}>Extrato Detalhado de Despesas</h3>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5' }}>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Data</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Obra</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Categoria</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Fornecedor</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Valor</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.despesasDetalhadas.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(d.data || d.vencimento).toLocaleDateString('pt-BR')}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.obras?.nome || 'Geral'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textTransform: 'capitalize' }}>{(d.categoria || '').replace('_', ' ')}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{d.fornecedor_nome || d.fornecedores?.nome || '-'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>R$ {Number(d.valor || 0).toLocaleString()}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                                {d.status === 'pago' ? 'Pago' : (d.vencimento && d.vencimento < todayStr) ? 'Vencido' : 'Pendente'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="analytic-section-print" style={{ marginTop: '40px' }}>
                            <h3 style={{ borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '15px' }}>Extrato Detalhado de Entradas</h3>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5' }}>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Data</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Obra</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Descrição/Origem</th>
                                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.entradasDetalhadas.map((e, i) => (
                                        <tr key={i}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(e.data).toLocaleDateString('pt-BR')}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.obras?.nome || 'Geral'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{e.descricao || 'Aporte Financeiro'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>R$ {Number(e.valor || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </div>
                )}

                <footer style={{ marginTop: '60px', textAlign: 'center', fontSize: '10pt', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    Documento gerado automaticamente pelo aplicativo Futura Gerenciamento de Obras
                </footer>
            </div>
        </div>
    )
}
