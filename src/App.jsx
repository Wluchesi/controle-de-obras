import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Obras } from './components/Obras'
import { Despesas } from './components/Despesas'
import { Fornecedores } from './components/Fornecedores'
import { Relatorios } from './components/Relatorios'
import { ContasAPagar } from './components/ContasAPagar'
import { Configuracoes } from './components/Configuracoes'
import { Compras } from './components/Compras'
import { BottomNav } from './components/BottomNav'

const AppContent = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  if (!user) {
    return <Login />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'obras':
        return <Obras />
      case 'custos':
        return <Despesas />
      case 'contas':
        return <ContasAPagar />
      case 'fornecedores':
        return <Fornecedores />
      case 'relatorios':
        return <Relatorios />
      case 'compras':
        return <Compras />
      case 'config':
        return <Configuracoes onTabChange={setActiveTab} />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
