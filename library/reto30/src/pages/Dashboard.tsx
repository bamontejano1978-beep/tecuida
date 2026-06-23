import React, { useState, useEffect } from 'react';

import type { Activity, ChallengeArea } from '../data/challenges';
import { Brain, Sun, Heart, CheckCircle2, ChevronRight, ChevronLeft, Calendar, Lock, Crown, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUnlockedDay, resetStartDate, FREE_DAYS_LIMIT, isDemoMode, setDemoMode, isDayPremiumLocked } from '../utils/progress';


import { APP_MODE } from '../config';
import { validatePromoCode } from '../utils/codes';

const areaIcons: Record<ChallengeArea, any> = {
    thoughts: Brain,
    activities: Sun,
    relationships: Heart,
};

const areaColors: Record<ChallengeArea, string> = {
    thoughts: 'var(--primary)',
    activities: 'var(--secondary)',
    relationships: 'var(--accent)',
};


const DashboardRedeemSection: React.FC<{ onUnlocked: () => void }> = ({ onUnlocked }) => {
    const { t } = useTranslation();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleRedeem = async () => {
        if (!code) return;
        setLoading(true);
        setStatus(null);

        try {
            const result = await validatePromoCode(code);
            setLoading(false);
            if (result.success) {
                setStatus({ type: 'success', msg: result.message });
                setTimeout(onUnlocked, 1500);
            } else {
                setStatus({ type: 'error', msg: result.message });
            }
        } catch (e) {
            setLoading(false);
            setStatus({ type: 'error', msg: 'Error de conexión' });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    placeholder={t('paywall.redeem_placeholder')}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        color: 'white',
                        flex: 1,
                        textTransform: 'uppercase',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={handleRedeem}
                    disabled={loading}
                    className="btn-primary"
                    style={{
                        padding: '0 1.2rem',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}
                >
                    {loading ? '...' : 'OK'}
                </button>
            </div>
            {status && (
                <p style={{
                    fontSize: '0.85rem',
                    color: status.type === 'success' ? '#4ade80' : '#ef4444',
                    marginTop: '0.2rem'
                }}>
                    {status.msg}
                </p>
            )}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const [currentDay, setCurrentDay] = useState<number>(1);
    const [unlockedDay, setUnlockedDay] = useState<number>(1);
    const [showWelcome, setShowWelcome] = useState(false);
    // const { isPremium } = usePremiumStatus();


    useEffect(() => {
        const unlocked = getUnlockedDay();
        setUnlockedDay(unlocked);
        setCurrentDay(unlocked);

        // Check if welcome message should be shown today
        const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastSeen = localStorage.getItem('mindful30_welcome_lastseen');

        if (lastSeen !== todayKey) {
            setShowWelcome(true);
        }

        // Check if unlocked day changes (e.g. at midnight)
        const timer = setInterval(() => {
            setUnlockedDay(getUnlockedDay());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const saveProgress = (day: number) => {
        setCurrentDay(day);
    };

    const handleCompleteDay = () => {
        if (currentDay < unlockedDay) {
            saveProgress(currentDay + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentDay < 31) {
            if (APP_MODE === 'DEMO' && currentDay === FREE_DAYS_LIMIT) {
                alert(t('dashboard.demo_complete_alert'));
                return;
            }
            if (currentDay === 30) {
                // Determine completion
                saveProgress(31); // 31 means completed
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            alert(t('dashboard.next_day_alert', { next: currentDay + 1 }));
        }
    };

    const challengesData = t('challenges', { returnObjects: true }) as any;
    const dailyChallengeTasks = currentDay <= 30 ? challengesData[`day${currentDay}`] : null;
    const progressPercent = Math.min(100, (currentDay / 30) * 100);

    // Completion View
    if (currentDay === 31) {
        return (
            <div className="fade-in" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '70vh',
                gap: '2rem',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <div style={{ color: 'var(--primary)', animation: 'pulse 2s infinite' }}>
                    <Crown size={80} strokeWidth={1} />
                </div>

                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {t('completion.title')}
                </h1>

                <div className="glass-card" style={{ padding: '2rem', width: '100%' }}>
                    <p style={{ fontSize: '1.2rem', lineHeight: 1.6, marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        {t('completion.message')}
                    </p>

                    <div style={{ padding: '1.5rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px', marginBottom: '2rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>{t('completion.feedback_title')}</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {t('completion.feedback_desc')}
                        </p>
                        <a
                            href="mailto:info@retomindful30.online?subject=Feedback Reto Mindful30"
                            className="btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <MessageCircle size={18} /> {t('completion.feedback_cta')}
                        </a>
                    </div>
                </div>

                <button
                    onClick={() => setCurrentDay(30)}
                    style={{ color: 'var(--text-secondary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    {t('completion.review_day_30')}
                </button>
            </div>
        );
    }

    if (!dailyChallengeTasks) return <div>{t('common.loading')}</div>;

    const handleCloseWelcome = () => {
        const todayKey = new Date().toISOString().split('T')[0];
        localStorage.setItem('mindful30_welcome_lastseen', todayKey);
        setShowWelcome(false);
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '100%', position: 'relative' }}>
            {/* Demo Mode Banner */}
            {isDemoMode() && (
                <div style={{
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '-1rem',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Sparkles size={20} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Modo Demo Partenariado: Días 1 y 2 desbloqueados</span>
                    </div>
                    <button
                        onClick={() => {
                            setDemoMode(false);
                            window.location.href = '/demo';
                        }}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            padding: '0.4rem 1rem',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        SALIR DEMO
                    </button>
                </div>
            )}

            {/* Daily Welcome Modal Overlay */}

            {showWelcome && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div className="card fade-in" style={{
                        maxWidth: '500px',
                        textAlign: 'center',
                        padding: '3rem 2rem',
                        border: '1px solid var(--primary)',
                        boxShadow: '0 20px 50px rgba(56, 189, 248, 0.2)'
                    }}>
                        <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
                            <Sparkles size={48} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{t('dashboard.welcome_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
                            {t('dashboard.welcome_message')}
                        </p>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1.5rem',
                            borderRadius: '16px',
                            borderLeft: '4px solid var(--secondary)',
                            marginBottom: '2.5rem',
                            fontStyle: 'italic'
                        }}>
                            <p style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>
                                "{t(`quotes.${currentDay}`)}"
                            </p>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '1.2rem' }}
                            onClick={handleCloseWelcome}
                        >
                            {t('dashboard.welcome_cta')}
                        </button>
                    </div>
                </div>
            )}

            {/* Progress Header */}
            <section className="card" style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{t('dashboard.progress_title')}</h2>
                    <span style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700 }}>{t('dashboard.day_x_of_30', { current: currentDay })}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </section>

            {/* Central Focal Day */}
            <section style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
                    {currentDay > 1 && (
                        <button onClick={() => setCurrentDay(currentDay - 1)} className="btn-icon" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                            <ChevronLeft size={32} />
                        </button>
                    )}
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>{t('dashboard.day_title', { day: currentDay })}</h1>
                    {currentDay < unlockedDay && (
                        <button onClick={() => setCurrentDay(currentDay + 1)} className="btn-icon" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                            <ChevronRight size={32} />
                        </button>
                    )}
                    {currentDay === unlockedDay && currentDay < 30 && (
                        <div style={{ color: 'var(--text-secondary)', opacity: 0.3, cursor: 'not-allowed' }}>
                            <Lock size={32} />
                        </div>
                    )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem' }}>
                    {currentDay === unlockedDay
                        ? t('dashboard.today_journal')
                        : t('dashboard.history_review')}
                </p>
            </section>

            {/* Dashboard Content */}
            {isDayPremiumLocked(currentDay) ? (

                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        color: 'var(--primary)'
                    }}>
                        <Sparkles size={40} />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
                        {APP_MODE === 'DEMO' ? t('paywall.title_demo') : t('paywall.title_premium')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
                        {APP_MODE === 'DEMO'
                            ? t('paywall.description_demo')
                            : t('paywall.description_premium')}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                        <a
                            href="https://buy.stripe.com/bJeeVd5X8bGAc9Wgut8N200"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.8rem', width: '100%', maxWidth: '350px', justifyContent: 'center' }}
                        >
                            {t('paywall.cta')} <ArrowRight size={20} />
                        </a>

                        <div style={{ width: '100%', maxWidth: '350px', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                {t('paywall.redeem_text')}
                            </p>
                            <DashboardRedeemSection onUnlocked={() => window.location.reload()} />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Tasks Group */}
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {(Object.entries(dailyChallengeTasks) as [ChallengeArea, Activity][]).map(([key, task]) => {
                            const Icon = areaIcons[key];
                            const color = areaColors[key];

                            return (
                                <Link
                                    key={key}
                                    to={`/app/resource/${task.resourceId}`}
                                    className="card fade-in"
                                    style={{
                                        padding: '2rem',
                                        display: 'flex',
                                        gap: '1.5rem',
                                        alignItems: 'center',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{
                                        background: `${color}15`,
                                        color: color,
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        display: 'flex'
                                    }}>
                                        <Icon size={28} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: color, letterSpacing: '0.05em' }}>
                                                {t(`areas.${key}`)}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{task.title}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>{task.description}</p>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.9rem',
                                            color: 'var(--text-accent)',
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '0.8rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px dashed var(--glass-border)'
                                        }}>
                                            <CheckCircle2 size={18} />
                                            <span>{task.actionItem}</span>
                                        </div>
                                    </div>

                                    <div style={{ color: 'var(--text-secondary)', marginLeft: '1rem' }}>
                                        <ChevronRight size={24} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Complete Day Action or Locked Message */}
                    {currentDay === unlockedDay ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                className="btn-primary"
                                onClick={handleCompleteDay}
                                style={{
                                    padding: '1.5rem',
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1rem',
                                    boxShadow: '0 10px 30px -10px var(--primary)'
                                }}
                            >
                                <CheckCircle2 size={24} />
                                <span>{t('dashboard.complete_button')}</span>
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
                            <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('dashboard.day_completed')}</p>
                            <button
                                onClick={() => setCurrentDay(unlockedDay)}
                                className="btn-icon"
                                style={{ background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.9rem', width: 'auto', gap: '0.5rem' }}
                            >
                                {t('dashboard.back_to_current')} <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Footer / History Toggle */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <Calendar size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    {t('dashboard.day_x_of_30', { current: currentDay })}
                </p>
                <button
                    onClick={() => {
                        if (confirm(t('dashboard.reset_confirm'))) {
                            resetStartDate();
                            saveProgress(1);
                            setUnlockedDay(1);
                        }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.5 }}
                >
                    {t('dashboard.reset_progress')}
                </button>
            </div>
        </div>
    );
};

export default Dashboard;


