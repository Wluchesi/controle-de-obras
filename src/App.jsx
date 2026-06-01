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
import { TopBar } from './components/TopBar'
import { SidebarMenu } from './components/SidebarMenu'

const AppContent = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
      <TopBar onMenuToggle={() => setIsMenuOpen(true)} />
      <SidebarMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
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
