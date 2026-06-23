import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Search, Clock, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getUnlockedDay } from '../utils/progress';

const Activities: React.FC = () => {
    const { t } = useTranslation();
    const [unlockedDay, setUnlockedDay] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setUnlockedDay(getUnlockedDay());
    }, []);

    // Fetch challenges from translations
    const challengesData = t('challenges', { returnObjects: true }) as any;

    const unlockedActivities = Object.keys(challengesData)
        .map(key => {
            const dayNum = parseInt(key.replace('day', ''));
            return {
                day: dayNum,
                task: challengesData[key].activities
            };
        })
        .filter(c => c.day <= unlockedDay)
        .filter(item =>
            item.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.task.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .reverse();

    return (
        <div style={{ maxWidth: '100%' }}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--secondary)', padding: '0.6rem', borderRadius: '12px' }}>
                        <Sun size={28} />
                    </div>
                    <div>
                        <h2 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>{t('activities_page.title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('activities_page.subtitle')}</p>
                    </div>
                </div>

                <div style={{ position: 'relative', maxWidth: '500px' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                    <input
                        type="text"
                        placeholder={t('activities_page.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.8rem 1rem 0.8rem 3rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--glass-border)',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {unlockedActivities.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem', gridColumn: '1 / -1' }}>
                        <Clock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                        <p style={{ color: 'var(--text-secondary)' }}>{t('activities_page.empty_locked')}</p>
                    </div>
                ) : (
                    unlockedActivities.map((item) => (
                        <div key={item.day} className="card fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 700 }}>{t('activities_page.day_label', { day: item.day })}</span>
                                    {item.day < unlockedDay && <Check size={16} className="text-primary" />}
                                </div>
                                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>{item.task.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                    {item.task.description}
                                </p>
                            </div>

                            <Link
                                to={`/app/resource/${item.task.resourceId}`}
                                className="btn-primary"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white',
                                    textAlign: 'center',
                                    display: 'block'
                                }}
                            >
                                {t('activities_page.view_guide')}
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Activities;
