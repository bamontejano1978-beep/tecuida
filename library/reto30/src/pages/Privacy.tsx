import React from 'react';
import { Shield, Mail, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Privacy: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', padding: '4rem 1rem' }}>
            <LanguageSwitcher />
            <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(var(--primary-h), var(--primary-s), 0.1)',
                        width: '80px',
                        height: '80px',
                        borderRadius: '24px',
                        marginBottom: '2rem'
                    }}>
                        <Shield size={40} color="var(--primary)" />
                    </div>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('privacy.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {t('privacy.last_updated')}
                    </p>
                </div>

                {/* Content */}
                <div className="card" style={{ padding: '3rem', lineHeight: 1.8 }}>
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Eye size={24} color="var(--primary)" />
                            {t('privacy.intro_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('privacy.intro_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem', marginBottom: '1rem' }}>
                            <li><strong>{t('privacy.intro_item_1_title')}</strong> {t('privacy.intro_item_1_desc')}</li>
                            <li><strong>{t('privacy.intro_item_2_title')}</strong> {t('privacy.intro_item_2_desc')}</li>
                            <li><strong>{t('privacy.intro_item_3_title')}</strong> {t('privacy.intro_item_3_desc')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Database size={24} color="var(--primary)" />
                            {t('privacy.usage_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('privacy.usage_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('privacy.usage_item_1')}</li>
                            <li>{t('privacy.usage_item_2')}</li>
                            <li>{t('privacy.usage_item_3')}</li>
                            <li>{t('privacy.usage_item_4')}</li>
                        </ul>
                        <p style={{ color: 'var(--primary)', marginTop: '1rem', fontStyle: 'italic' }}>
                            {t('privacy.usage_note')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Lock size={24} color="var(--primary)" />
                            {t('privacy.protection_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('privacy.protection_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('privacy.protection_item_1')}</li>
                            <li>{t('privacy.protection_item_2')}</li>
                            <li>{t('privacy.protection_item_3')}</li>
                            <li>{t('privacy.protection_item_4')}</li>
                            <li>{t('privacy.protection_item_5')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <UserCheck size={24} color="var(--primary)" />
                            {t('privacy.rights_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('privacy.rights_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li><strong>{t('privacy.rights_item_1_title')}</strong> {t('privacy.rights_item_1_desc')}</li>
                            <li><strong>{t('privacy.rights_item_2_title')}</strong> {t('privacy.rights_item_2_desc')}</li>
                            <li><strong>{t('privacy.rights_item_3_title')}</strong> {t('privacy.rights_item_3_desc')}</li>
                            <li><strong>{t('privacy.rights_item_4_title')}</strong> {t('privacy.rights_item_4_desc')}</li>
                            <li><strong>{t('privacy.rights_item_5_title')}</strong> {t('privacy.rights_item_5_desc')}</li>
                            <li><strong>{t('privacy.rights_item_6_title')}</strong> {t('privacy.rights_item_6_desc')}</li>
                        </ul>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
                            {t('privacy.rights_contact')}{' '}
                            <a href="mailto:info@retomindful30.online" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                info@retomindful30.online
                            </a>
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('privacy.cookies_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('privacy.cookies_desc')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('privacy.retention_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('privacy.retention_desc')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('privacy.changes_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('privacy.changes_desc')}
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Mail size={24} color="var(--primary)" />
                            {t('privacy.contact_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('privacy.contact_desc')}
                        </p>
                        <p style={{ color: 'var(--primary)', marginTop: '1rem', fontSize: '1.1rem' }}>
                            <a href="mailto:info@retomindful30.online" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                info@retomindful30.online
                            </a>
                        </p>
                    </section>
                </div>

                {/* Back to home */}
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <a href="/" style={{
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        ← {t('privacy.back_to_home')}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
