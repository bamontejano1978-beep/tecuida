import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import type { ChallengeArea, Activity } from '../data/challenges';
import { Brain, Sun, Heart, ArrowLeft, CheckCircle2, Lock, ChevronRight, Check } from 'lucide-react';
import { getUnlockedDay, isDayPremiumLocked } from '../utils/progress';
import Paywall from '../components/Paywall';

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


const DayDetail: React.FC = () => {
    const { dayNumber } = useParams<{ dayNumber: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const day = parseInt(dayNumber || '1');
    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});


    const challengesData = t('challenges', { returnObjects: true }) as any;
    const challenge = challengesData[`day${day}`];

    // Check if day is unlocked
    const unlockedDay = getUnlockedDay();
    // Force unlock first 2 days for demo purposes
    const isLocked = day > Math.max(unlockedDay, 2);

    const handleCompleteTask = (e: React.MouseEvent, taskId: string) => {
        e.preventDefault(); // Prevent navigation if inside Link
        e.stopPropagation();

        if (completedTasks[taskId]) return; // Already done

        // Trigger Confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        setCompletedTasks(prev => ({ ...prev, [taskId]: true }));
    };

    if (!challenge || isLocked) {
        return (
            <div className="container" style={{ maxWidth: '800px', textAlign: 'center', padding: '4rem' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '2rem',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={20} />
                    <span>{t('dashboard.back_progress')}</span>
                </button>
                <div className="card" style={{ padding: '3rem' }}>
                    <Lock size={64} style={{ color: 'var(--secondary)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h2 style={{ marginBottom: '1rem' }}>
                        {isLocked ? t('dashboard.locked_title', { day }) : t('resources.not_found_title')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isLocked
                            ? t('dashboard.locked_message')
                            : t('resources.not_found_message')}
                    </p>
                </div>
            </div>
        );
    }

    if (isDayPremiumLocked(day)) {
        return (
            <div className="container" style={{ maxWidth: '900px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '2rem',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={20} />
                    <span>{t('dashboard.back_progress')}</span>
                </button>
                <Paywall onPurchaseSuccess={() => { }} />
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '900px' }}>
            <button
                onClick={() => navigate('/')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '2rem',
                    padding: 0
                }}
            >
                <ArrowLeft size={20} />
                <span>{t('dashboard.back_progress')}</span>
            </button>

            <header style={{ marginBottom: '3rem' }}>
                <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{t('dashboard.day_title', { day })}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{t('app.subtitle')}</p>
            </header>

            <div style={{ display: 'grid', gap: '2rem' }}>
                {(Object.entries(challenge) as [ChallengeArea, Activity][]).map(([key, task]) => {
                    const Icon = areaIcons[key];
                    const color = areaColors[key];
                    const isCompleted = completedTasks[key];

                    return (
                        <div
                            key={key}
                            className="card fade-in"
                            style={{
                                padding: '2rem',
                                position: 'relative',
                                transition: 'transform 0.2s ease, border-color 0.2s ease',
                                display: 'block',
                                borderColor: isCompleted ? color : 'var(--glass-border)',
                                borderWidth: isCompleted ? '2px' : '1px'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '6px',
                                height: '100%',
                                backgroundColor: color,
                                opacity: isCompleted ? 1 : 0.7
                            }} />

                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{
                                    background: `${color}20`,
                                    padding: '1.5rem',
                                    borderRadius: '16px',
                                    height: 'fit-content',
                                    color: color,
                                    position: 'relative'
                                }}>
                                    <Icon size={32} />
                                    {isCompleted && (
                                        <div className="scale-in" style={{
                                            position: 'absolute',
                                            bottom: -8,
                                            right: -8,
                                            background: color,
                                            borderRadius: '50%',
                                            padding: '4px',
                                            border: '2px solid rgba(15, 23, 42, 1)'
                                        }}>
                                            <Check size={14} color="white" />
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <span style={{
                                                color: color,
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em'
                                            }}>
                                                {t(`areas.${key}`)}
                                            </span>
                                            <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{task.title}</h3>
                                        </div>

                                        <button
                                            onClick={(e) => handleCompleteTask(e, key)}
                                            style={{
                                                background: isCompleted ? color : 'transparent',
                                                color: isCompleted ? 'black' : color,
                                                border: `1px solid ${color}`,
                                                padding: '0.5rem 1rem',
                                                borderRadius: '20px',
                                                cursor: isCompleted ? 'default' : 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isCompleted ? t('dashboard.completed_label') : t('dashboard.mark_done')}
                                        </button>
                                    </div>

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                        {task.description}
                                    </p>

                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        border: '1px dashed var(--glass-border)',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <CheckCircle2 size={24} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                                            <p style={{ fontWeight: 500, margin: 0 }}>{task.actionItem}</p>
                                        </div>
                                    </div>

                                    <Link
                                        to={`/resource/${task.resourceId}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: color,
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        {t('dashboard.view_resource')} <ChevronRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DayDetail;
