import React from 'react'
import './Card.css'

export const Card = ({ children, className = '', glass = false }) => {
    return (
        <div className={`card ${glass ? 'glass' : ''} ${className}`}>
            {children}
        </div>
    )
}
