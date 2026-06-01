import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'
import { Building2, Layout } from 'lucide-react'
import './Login.css'

export const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { signIn } = useAuth()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await signIn({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    return (
        <div className="login-container">
            <div className="login-header">
                <div className="logo-badge">
                    <Building2 size={32} color="var(--accent)" />
                </div>
                <h1>Futura</h1>
                <p>Gerenciamento de Obras</p>
            </div>

            <Card className="login-card" glass>
                <form onSubmit={handleLogin}>
                    <Input
                        label="E-mail"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Senha"
                        type="password"
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <div className="login-error">{error}</div>}
                    <Button type="submit" className="login-btn" loading={loading} disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
            </Card>

            <div className="login-footer">
                <p>Â© 2026 Futura Solução</p>
            </div>
        </div>
    )
}
