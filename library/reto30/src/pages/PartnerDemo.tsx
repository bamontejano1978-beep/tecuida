import React from 'react';
import {
    Sparkles,
    Play,
    CheckCircle2,
    Briefcase,
    Users,
    Layout,
    Smartphone,
    Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setDemoMode } from '../utils/progress';

const PartnerDemo: React.FC = () => {
    const navigate = useNavigate();

    const handleStartDemo = () => {
        setDemoMode(true);
        navigate('/app');
    };

    const benefits = [
        {
            icon: Briefcase,
            title: "Oportunidad de Negocio",
            desc: "Ideal para gimnasios, centros de yoga y coaches que buscan ofrecer un valor añadido digital."
        },
        {
            icon: Users,
            title: "Fidelización de Clientes",
            desc: "Acompaña a tus clientes 24/7 con una herramienta de salud mental que complementa el ejercicio físico."
        },
        {
            icon: Layout,
            title: "Contenido Estructurado",
            desc: "30 días de ejercicios basados en TCC, psicología positiva y mindfulness de alto rendimiento."
        }
    ];

    return (
        <div style={{
            background: 'var(--bg-dark)',
            minHeight: '100vh',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            overflowX: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.1), transparent)'
            }}>
                <img src="/logo.png" alt="Logo" style={{ width: '80px', borderRadius: '16px', marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    Mindful30 <span className="text-gradient">Partner Demo</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Explora la experiencia digital que transformará el bienestar de tu comunidad.
                </p>
            </div>

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
                {/* Intro Section */}
                <div className="card" style={{ padding: '3rem', marginBottom: '4rem', textAlign: 'center', border: '1px solid var(--primary)' }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>¿Qué es Mindful30?</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
                        Mindful30 es un programa de 30 días diseñado para optimizar la salud mental y el rendimiento.
                        A través de tres pilares fundamentales (**Pensamientos, Actividades y Relaciones**),
                        guiamos al usuario en un viaje de autodescubrimiento y mejora continua con ejercicios prácticos diarios.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-accent)' }}>
                            <Smartphone size={20} /> Optimizado para Móvil
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-accent)' }}>
                            <Globe size={20} /> Acceso Web & App
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-accent)' }}>
                            <CheckCircle2 size={20} /> Basado en Evidencia
                        </div>
                    </div>
                </div>

                {/* Benefits Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                    {benefits.map((b, i) => (
                        <div key={i} className="card" style={{ padding: '2rem' }}>
                            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                                <b.icon size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>{b.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{b.desc}</p>
                        </div>
                    ))}
                </div>

                {/* CTA Section */}
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '32px',
                    border: '1px solid var(--glass-border)'
                }}>
                    <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '1.5rem' }}>Prueba la Experiencia</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
                        Hemos desbloqueado los **primeros 2 días** para que puedas navegar por la interfaz y ver el tipo de contenido que ofrecemos.
                    </p>

                    <button
                        onClick={handleStartDemo}
                        className="btn-primary"
                        style={{
                            padding: '1.5rem 4rem',
                            fontSize: '1.3rem',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}
                    >
                        <Play size={24} fill="currentColor" /> Comenzar Web Demo
                    </button>

                    <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>
                        * La demo web simula el funcionamiento de la aplicación móvil original.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                © 2026 Mindful30 - Alianzas Estratégicas
            </footer>
        </div>
    );
};

export default PartnerDemo;
