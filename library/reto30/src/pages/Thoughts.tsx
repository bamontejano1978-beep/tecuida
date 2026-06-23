import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Search, Clock, ChevronRight, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getUnlockedDay } from '../utils/progress';

const Thoughts: React.FC = () => {
  const { t } = useTranslation();
  const [unlockedDay, setUnlockedDay] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setUnlockedDay(getUnlockedDay());
  }, []);

  // Fetch challenges from translations
  const challengesData = t('challenges', { returnObjects: true }) as any;

  // Filter tasks from all unlocked days
  const unlockedThoughts = Object.keys(challengesData)
    .map(key => {
      const dayNum = parseInt(key.replace('day', ''));
      return {
        day: dayNum,
        task: challengesData[key].thoughts,
        savedReflection: localStorage.getItem(`mindful30_cbt_${challengesData[key].thoughts.resourceId}`) || ''
      };
    })
    .filter(c => c.day <= unlockedDay)
    .filter(item =>
      item.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.task.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reverse(); // Newest first

  return (
    <div style={{ maxWidth: '100%' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', padding: '0.6rem', borderRadius: '12px' }}>
            <Brain size={28} />
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.8rem', margin: 0 }}>{t('thoughts_page.title')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('thoughts_page.subtitle')}</p>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input
            type="text"
            placeholder={t('thoughts_page.search_placeholder')}
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
        {unlockedThoughts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Clock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)' }}>{t('thoughts_page.empty_locked')}</p>
          </div>
        ) : (
          unlockedThoughts.map((item) => (
            <div key={item.day} className="card fade-in" style={{ padding: '0' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, opacity: 0.3 }}>{item.day.toString().padStart(2, '0')}</span>
                  <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{item.task.title}</h3>
                </div>
                <Link
                  to={`/app/resource/${item.task.resourceId}`}
                  className="btn-icon"
                  style={{ color: 'var(--primary)' }}
                >
                  <ChevronRight size={24} />
                </Link>
              </div>

              <div style={{ padding: '1.5rem 2rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {item.task.description}
                </p>

                {item.savedReflection ? (
                  <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', padding: '1.2rem', borderRadius: '12px', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                      <MessageSquare size={16} /> {t('thoughts_page.your_reflection')}
                    </div>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>"{item.savedReflection}"</p>
                  </div>
                ) : (
                  <Link
                    to={`/app/resource/${item.task.resourceId}`}
                    style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                  >
                    {t('thoughts_page.add_reflection')}
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Thoughts;
