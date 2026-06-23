import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Search, Clock, MessageCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getUnlockedDay } from '../utils/progress';

const Relationships: React.FC = () => {
    const { t } = useTranslation();
    const [unlockedDay, setUnlockedDay] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setUnlockedDay(getUnlockedDay());
    }, []);

    // Fetch challenges from translations
    const challengesData = t('challenges', { returnObjects: true }) as any;

    const unlockedRelationships = Object.keys(challengesData)
        .map(key => {
            const dayNum = parseInt(key.replace('day', ''));
            return {
                day: dayNum,
                task: challengesData[key].relationships
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
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', padding: '0.6rem', borderRadius: '12px' }}>
                        <Heart size={28} />
                    </div>
                    <div>
                        <h2 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>{t('relationships_page.title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('relationships_page.subtitle')}</p>
                    </div>
                </div>

                <div style={{ position: 'relative', maxWidth: '500px' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                    <input
                        type="text"
                        placeholder={t('relationships_page.search_placeholder')}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                {unlockedRelationships.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <Clock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                        <p style={{ color: 'var(--text-secondary)' }}>{t('relationships_page.empty_locked')}</p>
                    </div>
                ) : (
                    unlockedRelationships.map((item) => (
                        <div key={item.day} className="card fade-in" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ display: 'flex' }}>
                                <div style={{
                                    width: '80px',
                                    background: 'rgba(var(--accent-rgb), 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRight: '1px solid var(--glass-border)'
                                }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)', opacity: 0.6 }}>{t('relationships_page.day_label')}</span>
                                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{item.day}</span>
                                </div>
                                <div style={{ flex: 1, padding: '1.5rem 2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{item.task.title}</h3>
                                        <Link
                                            to={`/app/resource/${item.task.resourceId}`}
                                            style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', fontWeight: 600 }}
                                        >
                                            {t('relationships_page.review_script')} <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                        {item.task.description}
                                    </p>
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-accent)', fontSize: '0.85rem', background: 'rgba(56, 189, 248, 0.05)', padding: '0.5rem 1rem', borderRadius: '8px', width: 'fit-content' }}>
                                        <MessageCircle size={14} />
                                        <span>{t('relationships_page.includes_script')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Relationships;
