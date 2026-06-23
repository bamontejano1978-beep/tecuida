import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Save, MessageCircle, Info, Copy, Check, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getUnlockedDay } from '../utils/progress';
import { usePremiumStatus } from '../hooks/usePremiumStatus';
import Paywall from '../components/Paywall';

const ResourceView: React.FC = () => {
    const { t } = useTranslation();
    const { resourceId } = useParams<{ resourceId: string }>();
    const navigate = useNavigate();
    const { isPremium } = usePremiumStatus();

    // Fetch resource from translations
    const resourcesData = t('resources_data', { returnObjects: true }) as any;
    const resource = resourceId ? resourcesData[resourceId] : undefined;

    // Check if resource is locked based on real-time progress
    const unlockedDay = getUnlockedDay();
    const resourceDay = resourceId ? parseInt(resourceId.split('-')[1]) : 0;
    // Force unlock first 2 days for demo purposes
    const isLocked = resourceDay > Math.max(unlockedDay, 2);

    if (!resource || isLocked) {
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
                    <span>{t('resources.back')}</span>
                </button>
                <div className="card" style={{ padding: '3rem' }}>
                    <Lock size={64} style={{ color: 'var(--secondary)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h2 style={{ marginBottom: '1rem' }}>
                        {isLocked ? t('resources.locked_title') : t('resources.not_found_title')}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isLocked
                            ? t('resources.locked_message', { day: resourceDay })
                            : t('resources.not_found_message')}
                    </p>
                </div>
            </div>
        );
    }

    if (resourceDay > 3 && !isPremium) {
        return (
            <div className="container" style={{ maxWidth: '800px' }}>
                <button
                    onClick={() => navigate(-1)}
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
                    <span>{t('resources.back_to_dashboard')}</span>
                </button>
                <Paywall onPurchaseSuccess={() => { }} />
            </div>
        );
    }

    const renderResourceContent = () => {
        switch (resource.type) {
            case 'tool':
                if (resourceId === 'activities-7') return <BreathingExercise />;
                if (resourceId === 'activities-2') return <MovementGuide />;
                if (resourceId === 'activities-27') return <LaughterTool />;
                return <InstructionalGuide title={resource.title} steps={resource.content.steps || []} />;
            case 'cbt':
                return <CBTTool resourceId={resourceId!} title={resource.title} prompt={resource.content.prompt} guide={resource.content.guide} />;
            case 'social':
                return <SocialScript title={resource.title} script={resource.content.script} advice={resource.content.advice} />;
            case 'guide':
            default:
                return <InstructionalGuide title={resource.title} steps={resource.content.steps || []} />;
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <button
                onClick={() => navigate(-1)}
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
                <span>{t('resources.back_to_dashboard')}</span>
            </button>

            {renderResourceContent()}
        </div>
    );
};

// --- Specialized Resource Components ---

const BreathingExercise: React.FC = () => {
    const { t } = useTranslation();
    const [phase, setPhase] = useState<'Inhala' | 'Mantén' | 'Exhala'>('Inhala');
    const [seconds, setSeconds] = useState(4);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds((prev) => {
                    if (prev === 1) {
                        if (phase === 'Inhala') { setPhase('Mantén'); return 4; }
                        if (phase === 'Mantén') { setPhase('Exhala'); return 4; }
                        if (phase === 'Exhala') { setPhase('Inhala'); return 4; }
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, phase]);

    const phaseLabels: Record<string, string> = {
        'Inhala': t('resources.breathing.inhale'),
        'Mantén': t('resources.breathing.hold'),
        'Exhala': t('resources.breathing.exhale')
    };

    return (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>{t('resources.breathing.title')}</h2>
            <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '4px solid var(--primary)',
                margin: '0 auto 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 4s ease-in-out',
                transform: isActive && phase === 'Inhala' ? 'scale(1.2)' : isActive && phase === 'Exhala' ? 'scale(0.8)' : 'scale(1)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{phaseLabels[phase]}</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{seconds}</div>
                </div>
            </div>
            <button
                onClick={() => setIsActive(!isActive)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
            >
                {isActive ? <Pause size={20} /> : <Play size={20} />}
                {isActive ? t('resources.breathing.pause') : t('resources.breathing.start')}
            </button>
        </div>
    );
};

const LaughterTool: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{t('resources.laughter.title')}</h2>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>😂</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {t('resources.laughter.message')}
            </p>
            <button className="btn-secondary" onClick={() => window.open('https://www.youtube.com/results?search_query=funny+cats', '_blank')}>
                {t('resources.laughter.cta')}
            </button>
        </div>
    );
};

const MovementGuide: React.FC = () => {
    const { t } = useTranslation();

    // Movements data is now translated
    const movements = t('resources.movement.steps', { returnObjects: true }) as any[];

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <h2 className="text-gradient" style={{ textAlign: 'center' }}>{t('resources.movement.title')}</h2>
            {movements.map((m, i) => (
                <div key={i} className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--secondary)', marginBottom: '0.5rem' }}>{m.title}</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{m.desc}</p>
                </div>
            ))}
        </div>
    );
};

const CBTTool: React.FC<{ resourceId: string, title: string, prompt: string, guide: string }> = ({ resourceId, title, prompt, guide }) => {
    const { t } = useTranslation();
    const [response, setResponse] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(`mindful30_cbt_${resourceId}`);
        if (saved) setResponse(saved);
    }, [resourceId]);

    const handleSave = () => {
        localStorage.setItem(`mindful30_cbt_${resourceId}`, response);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Save className="text-primary" size={32} />
                <h2 className="text-gradient" style={{ margin: 0 }}>{title}</h2>
            </div>

            <div style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.05)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>{t('resources.cbt.your_exercise')}</p>
                <p style={{ fontSize: '1.2rem', lineHeight: 1.6 }}>{prompt}</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={t('resources.cbt.placeholder')}
                    style={{
                        width: '100%',
                        minHeight: '150px',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        resize: 'vertical',
                        marginBottom: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
                <button
                    onClick={handleSave}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {isSaved ? <Check size={20} /> : <Save size={20} />}
                    {isSaved ? t('resources.cbt.saved') : t('resources.cbt.save')}
                </button>
            </div>

            <div style={{ borderLeft: '4px solid var(--secondary)', paddingLeft: '1.5rem' }}>
                <p style={{ fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Info size={18} /> {t('resources.cbt.expert_guide')}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>{guide}</p>
            </div>
        </div>
    );
};

const SocialScript: React.FC<{ title: string, script: string, advice: string }> = ({ title, script, advice }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <MessageCircle className="text-secondary" size={32} />
                <h2 className="text-gradient" style={{ margin: 0 }}>{title}</h2>
            </div>

            <div style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px dashed var(--glass-border)',
                padding: '2rem',
                borderRadius: '1rem',
                marginBottom: '2rem',
                position: 'relative'
            }}>
                <span style={{ position: 'absolute', top: -10, left: 20, background: 'var(--bg-dark)', padding: '0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>{t('resources.social.suggested_script')}</span>
                <p style={{ fontSize: '1.25rem', lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>"{script}"</p>

                <button
                    onClick={handleCopy}
                    style={{
                        background: copied ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: '0 auto',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? t('resources.social.copied') : t('resources.social.copy')}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'rgba(var(--secondary-rgb), 0.05)', padding: '1.2rem', borderRadius: '12px' }}>
                <div style={{ background: 'var(--secondary)', color: 'white', borderRadius: '50%', padding: '5px', display: 'flex', flexShrink: 0 }}>
                    <Info size={16} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}><strong>{t('resources.social.advice_label')}:</strong> {advice}</p>
            </div>
        </div>
    );
};

const InstructionalGuide: React.FC<{ title: string, steps: string[] }> = ({ title, steps }) => {
    return (
        <div className="card" style={{ padding: '2.5rem' }}>
            <h2 className="text-gradient" style={{ marginBottom: '2rem', textAlign: 'center' }}>{title}</h2>
            <div style={{ display: 'grid', gap: '1.2rem' }}>
                {steps.map((step, index) => (
                    <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'var(--primary)',
                            color: 'white',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 700,
                            fontSize: '0.9rem'
                        }}>
                            {index + 1}
                        </div>
                        <p style={{ lineHeight: 1.5, color: 'var(--text-primary)' }}>{step}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourceView;
