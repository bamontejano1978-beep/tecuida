import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
    variant?: 'fixed' | 'inline';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'fixed' }) => {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const currentLang = i18n.language || 'es';

    const containerStyle: React.CSSProperties = variant === 'fixed' ? {
        position: 'fixed',
        top: '15px',
        right: '15px',
        zIndex: 9999,
        display: 'flex',
        gap: '0.6rem',
        background: 'rgba(15, 23, 42, 0.4)',
        padding: '4px',
        borderRadius: '12px',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    } : {
        display: 'flex',
        gap: '0.4rem',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '2px',
        borderRadius: '10px',
        border: '1px solid var(--glass-border)'
    };

    const buttonStyle = (lang: string): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        opacity: currentLang.startsWith(lang) ? 1 : 0.4,
        transform: currentLang.startsWith(lang) ? 'scale(1.02)' : 'scale(1)',
        fontWeight: currentLang.startsWith(lang) ? '700' : '500',
        padding: variant === 'fixed' ? '0.5rem 0.8rem' : '0.35rem 0.6rem',
        background: currentLang.startsWith(lang) ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: variant === 'fixed' ? '0.9rem' : '0.75rem'
    });

    return (
        <div style={containerStyle}>
            <button
                onClick={() => changeLanguage('es')}
                title="Español"
                style={buttonStyle('es')}
            >
                <span style={{ fontSize: variant === 'fixed' ? '1.2rem' : '0.95rem' }}>🇪🇸</span> ES
            </button>
            <button
                onClick={() => changeLanguage('en')}
                title="English"
                style={buttonStyle('en')}
            >
                <span style={{ fontSize: variant === 'fixed' ? '1.2rem' : '0.95rem' }}>🇺🇸</span> EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
