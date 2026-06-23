import React from 'react';
import {
    Sparkles,
    Brain,
    Sun,
    Heart,
    CheckCircle2,
    ArrowRight,
    Crown,
    Download,
    Calendar,
    Zap,
    MessageCircle,
    Smartphone,
    Shield,
    AlertCircle,
    ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Landing: React.FC = () => {
    const { t } = useTranslation();
    const stripeLink = "https://buy.stripe.com/bJeeVd5X8bGAc9Wgut8N200"; // Production sales link
    const downloadLink = "https://github.com/bamontejano/mindful30/releases/download/v1.0.0/mindful30-release.apk"; // GitHub Release Link

    const pillars = [
        {
            title: t('landing.pillar_thoughts_title'),
            description: t('landing.pillar_thoughts_desc'),
            icon: Brain,
            color: 'var(--primary)'
        },
        {
            title: t('landing.pillar_activities_title'),
            description: t('landing.pillar_activities_desc'),
            icon: Sun,
            color: 'var(--secondary)'
        },
        {
            title: t('landing.pillar_relationships_title'),
            description: t('landing.pillar_relationships_desc'),
            icon: Heart,
            color: 'var(--accent)'
        }
    ];

    const steps = [
        {
            number: '01',
            title: t('landing.step_1_title'),
            description: t('landing.step_1_desc')
        },
        {
            number: '02',
            title: t('landing.step_2_title'),
            description: t('landing.step_2_desc')
        },
        {
            number: '03',
            title: t('landing.step_3_title'),
            description: t('landing.step_3_desc')
        }
    ];

    const faqs = [
        {
            q: t('landing.faq_q1', '¿Es una suscripción?'),
            a: t('landing.faq_a1', 'No. Es un pago único que te da acceso de por vida a todo el contenido del reto y futuras actualizaciones.')
        },
        {
            q: t('landing.faq_q2', '¿Necesito conocimientos previos?'),
            a: t('landing.faq_a2', 'Para nada. Mindful30 está diseñado para guiarte desde cero con lenguaje claro y ejercicios prácticos.')
        },
        {
            q: t('landing.faq_q3', '¿Funciona en el móvil?'),
            a: t('landing.faq_a3', 'Sí, la aplicación está optimizada para dispositivos móviles y puedes descargar el APK directamente aquí.')
        },
        {
            q: t('landing.faq_q4', '¿Son privados mis datos?'),
            a: t('landing.faq_a4', 'Totalmente. Tus reflexiones y diario se guardan localmente en tu dispositivo. Nosotros no tenemos acceso a tus pensamientos.')
        }
    ];

    return (
        <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <LanguageSwitcher />
            {/* Hero Section */}
            <section style={{
                padding: '8rem 1rem 6rem',
                textAlign: 'center',
                background: 'radial-gradient(circle at top center, rgba(var(--primary-h), var(--primary-s), 0.15) 0%, transparent 70%)',
                position: 'relative'
            }}>
                <div className="container">
                    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <span style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                color: 'var(--text-accent)',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Zap size={14} fill="currentColor" /> {t('landing.update_badge')}
                            </span>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <img
                                src="/logo.png"
                                alt="Mindful30 Logo"
                                style={{
                                    width: '140px',
                                    height: '140px',
                                    borderRadius: '28px',
                                    boxShadow: '0 20px 50px rgba(56, 189, 248, 0.3)',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            />
                        </div>

                        <h1 style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '2rem', fontWeight: 800, letterSpacing: '-2px' }}>
                            {t('landing.hero_title_prefix')} <span className="text-gradient">{t('landing.hero_title_highlight')}</span>
                        </h1>
                        <p style={{ fontSize: '1.3rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6, fontWeight: 400 }}>
                            {t('landing.hero_description')}
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href={stripeLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderRadius: '16px' }}>
                                {t('landing.cta_join')} <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                            </a>
                            <a href="/app" style={{
                                padding: '1.2rem 2.5rem',
                                borderRadius: '16px',
                                border: '1px solid var(--primary)',
                                background: 'rgba(var(--primary-h), var(--primary-s), 0.1)',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                boxShadow: '0 0 20px rgba(var(--primary-h), var(--primary-s), 0.2)'
                            }}>
                                {t('landing.cta_pwa')} <Sparkles size={20} color="var(--primary)" />
                            </a>
                            <a href={downloadLink} download="mindful30-release.apk" style={{
                                padding: '1.2rem 2.5rem',
                                borderRadius: '16px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.03)',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem'
                            }}>
                                {t('landing.cta_download')} <Smartphone size={20} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features / Why Mindful30 */}
            <section style={{ padding: '4rem 1rem' }}>
                <div className="container">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '3rem',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '3rem',
                        borderRadius: '32px',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--primary)' }}><Shield size={32} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('landing.features_tcc_title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('landing.features_tcc_desc')}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--secondary)' }}><Calendar size={32} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('landing.features_guide_title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('landing.features_guide_desc')}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ color: 'var(--accent)' }}><Smartphone size={32} /></div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('landing.features_offline_title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('landing.features_offline_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pillars Section */}
            <section style={{ padding: '6rem 1rem' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, letterSpacing: '2px', fontSize: '0.9rem' }}>{t('landing.pillars_subtitle')}</span>
                        <h2 style={{ fontSize: '3rem', marginTop: '1rem' }}>{t('landing.pillars_title')}</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
                        {pillars.map((pillar, i) => (
                            <div key={i} className="card" style={{ padding: '4rem 3rem', border: '1px solid var(--glass-border)', transition: 'transform 0.3s ease' }}>
                                <div style={{
                                    background: `rgba(${pillar.color === 'var(--primary)' ? '174, 60%, 50%' : pillar.color === 'var(--secondary)' ? '260, 60%, 60%' : '330, 70%, 60%'}, 0.1)`,
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2.5rem',
                                    color: pillar.color,
                                    boxShadow: `0 10px 30px -10px ${pillar.color}44`
                                }}>
                                    <pillar.icon size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.8rem', marginBottom: '1.2rem' }}>{pillar.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>{pillar.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section style={{ padding: '6rem 1rem', background: 'rgba(255,255,255,0.01)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h2 style={{ fontSize: '3rem' }}>{t('landing.steps_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('landing.steps_subtitle')}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', position: 'relative' }}>
                        {steps.map((step, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                                <div style={{ fontSize: '6rem', fontWeight: 900, color: 'rgba(255,255,255,0.03)', position: 'absolute', top: '-40px', left: '-10px', zIndex: 0 }}>
                                    {step.number}
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <h4 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{step.title}</h4>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Download Section */}
            <section style={{ padding: '8rem 1rem' }}>
                <div className="container">
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, rgba(var(--primary-h), var(--primary-s), 0.1) 0%, rgba(var(--secondary-h), var(--secondary-s), 0.05) 100%)',
                        padding: '4rem',
                        borderRadius: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div style={{
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '1rem',
                            borderRadius: '24px',
                            marginBottom: '2rem',
                            boxShadow: '0 20px 40px rgba(var(--primary-h), var(--primary-s), 0.3)'
                        }}>
                            <Download size={40} />
                        </div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>{t('landing.download_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '3rem', fontSize: '1.2rem' }}>
                            {t('landing.download_desc')}
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href="/app" className="btn-primary" style={{
                                padding: '1.2rem 3rem',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                background: 'var(--primary)',
                                color: 'white'
                            }}>
                                {t('landing.cta_pwa')} <Sparkles size={20} />
                            </a>
                            <a href={downloadLink} download="mindful30-release.apk" style={{
                                padding: '1.2rem 3rem',
                                borderRadius: '20px',
                                border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem'
                            }}>
                                {t('landing.cta_download')} <Smartphone size={20} />
                            </a>
                        </div>
                        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t('landing.download_compatibility')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Security Info Section */}
            <section style={{ padding: '4rem 1rem', background: 'rgba(0,0,0,0.2)' }}>
                <div className="container" style={{ maxWidth: '900px' }}>
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '3rem'
                    }}>
                        <span style={{ color: 'var(--secondary)', fontWeight: 700, letterSpacing: '2px', fontSize: '0.9rem' }}>{t('landing.security_subtitle')}</span>
                        <h2 style={{ fontSize: '2.5rem', marginTop: '1rem' }}>{t('landing.security_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '1.1rem' }}>
                            {t('landing.security_desc')}
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2rem',
                        marginBottom: '4rem'
                    }}>
                        <div style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <Download size={20} color="var(--primary)" /> {t('landing.security_step_1_title')}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.security_step_1_desc')}</p>
                        </div>
                        <div style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <Smartphone size={20} color="var(--secondary)" /> {t('landing.security_step_2_title')}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.security_step_2_desc')}</p>
                        </div>
                        <div style={{
                            padding: '2rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '24px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <ShieldCheck size={20} color="var(--accent)" /> {t('landing.security_step_3_title')}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.security_step_3_desc')}</p>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(var(--primary-h), var(--primary-s), 0.05)',
                        border: '1px solid rgba(var(--primary-h), var(--primary-s), 0.2)',
                        padding: '2rem',
                        borderRadius: '24px',
                        display: 'flex',
                        gap: '1.5rem',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{ color: 'var(--primary)', padding: '0.5rem' }}>
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('landing.security_warning_title')}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
                                {t('landing.security_warning_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section style={{ padding: '6rem 1rem' }}>
                <div className="container">
                    <div className="card" style={{
                        maxWidth: '1000px',
                        margin: '0 auto',
                        padding: '5rem 4rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '5rem',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: '48px'
                    }}>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFD700', marginBottom: '1.5rem' }}>
                                <Crown size={24} fill="#FFD700" />
                                <span style={{ fontWeight: 800, letterSpacing: '2px', fontSize: '0.9rem' }}>{t('landing.pricing_access')}</span>
                            </div>
                            <h2 style={{ fontSize: '3.5rem', marginBottom: '2rem', lineHeight: 1.1 }}>{t('landing.pricing_title_prefix')} <br /><span className="text-gradient">{t('landing.pricing_title_highlight')}</span></h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
                                {[
                                    t('landing.pricing_feature_1'),
                                    t('landing.pricing_feature_2'),
                                    t('landing.pricing_feature_3')
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(var(--primary-h), var(--primary-s), 0.1)', padding: '4px', borderRadius: '50%' }}>
                                            <CheckCircle2 size={20} color="var(--primary)" />
                                        </div>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '4rem 3rem',
                            borderRadius: '40px',
                            border: '1px solid var(--glass-border)',
                            position: 'relative',
                            zIndex: 1,
                            backdropFilter: 'blur(20px)'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '0.4rem 1.2rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 700
                            }}>
                                {t('landing.pricing_offer')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('landing.pricing_type', 'PAGO ÚNICO')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'line-through', opacity: 0.5 }}>€14,99</span>
                                <span style={{ fontSize: '5rem', fontWeight: 800, letterSpacing: '-3px', color: 'var(--primary)' }}>€7,49</span>
                            </div>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('landing.pricing_no_subs')}</p>
                            <a href={stripeLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: '100%', padding: '1.4rem', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '1.2rem' }}>
                                <Sparkles size={22} /> {t('landing.pricing_cta')}
                            </a>
                        </div>

                        {/* Background Gradients */}
                        <div style={{
                            position: 'absolute',
                            top: '-20%',
                            right: '-10%',
                            width: '500px',
                            height: '500px',
                            background: 'radial-gradient(circle, rgba(var(--primary-h), var(--primary-s), 0.15) 0%, transparent 70%)',
                            zIndex: 0
                        }} />
                        <div style={{
                            position: 'absolute',
                            bottom: '-20%',
                            left: '-10%',
                            width: '500px',
                            height: '500px',
                            background: 'radial-gradient(circle, rgba(var(--secondary-h), var(--secondary-s), 0.1) 0%, transparent 70%)',
                            zIndex: 0
                        }} />
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section style={{ padding: '6rem 1rem' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '4rem' }}>{t('landing.faq_title')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {faqs.map((faq, i) => (
                            <div key={i} style={{
                                padding: '2rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '24px',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <MessageCircle size={20} color="var(--primary)" /> {faq.q}
                                </h4>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '6rem 1rem 3rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4rem', marginBottom: '5rem' }}>
                        <div>
                            <h3 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Mindful30</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {t('landing.footer_description')}
                            </p>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{t('landing.nav_navigation')}</h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', padding: 0 }}>
                                <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_about')}</a></li>
                                <li><a href={stripeLink} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_purchase')}</a></li>
                                <li><a href={downloadLink} download="mindful30-release.apk" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_download')}</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>{t('landing.nav_info')}</h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', padding: 0 }}>
                                <li><a href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_privacy')}</a></li>
                                <li><a href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_terms')}</a></li>
                                <li><a href="mailto:info@retomindful30.online" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('landing.nav_contact')}</a></li>
                            </ul>
                        </div>
                    </div>
                    <div style={{
                        paddingTop: '3rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>
                            {t('landing.footer_rights')}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', maxWidth: '600px', margin: '0 auto' }}>
                            {t('landing.footer_disclaimer')}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
