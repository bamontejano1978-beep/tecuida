import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Brain, Sun, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePremiumStatus } from '../hooks/usePremiumStatus';
import Paywall from '../components/Paywall';

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { isPremium, loading } = usePremiumStatus();

  const navItems = [
    { path: '/app', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/app/thoughts', label: t('nav.thoughts'), icon: Brain },
    { path: '/app/activities', label: t('nav.activities'), icon: Sun },
    { path: '/app/relationships', label: t('nav.relationships'), icon: Heart },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
      {/* Optimized Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0.8rem 0'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <h1 className="text-gradient" style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Mindful30</h1>
          </div>
          <LanguageSwitcher variant="inline" />
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: '1.5rem 1rem 6rem' }}>
        {/* Web Notice Banner */}
        {!(window as any).Capacitor?.isNativePlatform && isPremium && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            opacity: 0.8
          }}>
            <p style={{ margin: 0, color: 'var(--text-accent)' }}>
              Para notificaciones diarias, descarga la App.
            </p>
            <a href="/" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Inicio
            </a>
          </div>
        )}
        <div className="fade-in">
          {isPremium ? (
            <Outlet />
          ) : (
            <Paywall onPurchaseSuccess={() => window.location.reload()} />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      {isPremium && (
        <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.8rem 0.5rem env(safe-area-inset-bottom)',
        zIndex: 100
      }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.3rem',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              width: '25%'
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  padding: '0.3rem 1.2rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        </nav>
      )}
    </div>
  );
};

export default MainLayout;
