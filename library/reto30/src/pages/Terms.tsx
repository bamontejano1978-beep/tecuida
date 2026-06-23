import React from 'react';
import { FileText, AlertCircle, CreditCard, Ban, RefreshCw, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Terms: React.FC = () => {
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
                        <FileText size={40} color="var(--primary)" />
                    </div>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t('terms.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {t('terms.last_updated')}
                    </p>
                </div>

                {/* Content */}
                <div className="card" style={{ padding: '3rem', lineHeight: 1.8 }}>
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.acceptance_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.acceptance_desc')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.service_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('terms.service_desc_intro')}
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>{t('terms.service_desc_list_intro')}</p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('terms.service_item_1')}</li>
                            <li>{t('terms.service_item_2')}</li>
                            <li>{t('terms.service_item_3')}</li>
                            <li>{t('terms.service_item_4')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <AlertCircle size={24} color="var(--primary)" />
                            {t('terms.disclaimer_title')}
                        </h2>
                        <div style={{
                            background: 'rgba(255, 200, 0, 0.1)',
                            border: '1px solid rgba(255, 200, 0, 0.3)',
                            borderRadius: '16px',
                            padding: '2rem',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {t('terms.disclaimer_important')}
                            </p>
                        </div>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('terms.disclaimer_list_1')}</li>
                            <li>{t('terms.disclaimer_list_2')}</li>
                            <li>{t('terms.disclaimer_list_3')}</li>
                            <li>{t('terms.disclaimer_list_4')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <CreditCard size={24} color="var(--primary)" />
                            {t('terms.payment_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('terms.payment_intro')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li><strong>{t('terms.payment_item_1_title')}</strong> {t('terms.payment_item_1_desc')}</li>
                            <li><strong>{t('terms.payment_item_2_title')}</strong> {t('terms.payment_item_2_desc')}</li>
                            <li><strong>{t('terms.payment_item_3_title')}</strong> {t('terms.payment_item_3_desc')}</li>
                            <li><strong>{t('terms.payment_item_4_title')}</strong> {t('terms.payment_item_4_desc')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <RefreshCw size={24} color="var(--primary)" />
                            {t('terms.refund_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('terms.refund_intro')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('terms.refund_item_1')}</li>
                            <li>{t('terms.refund_item_2')}</li>
                            <li>{t('terms.refund_item_3')}</li>
                            <li>{t('terms.refund_item_4')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.ip_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('terms.ip_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('terms.ip_item_1')}</li>
                            <li>{t('terms.ip_item_2')}</li>
                            <li>{t('terms.ip_item_3')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Ban size={24} color="var(--primary)" />
                            {t('terms.usage_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {t('terms.usage_intro')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                            <li>{t('terms.usage_item_1')}</li>
                            <li>{t('terms.usage_item_2')}</li>
                            <li>{t('terms.usage_item_3')}</li>
                            <li>{t('terms.usage_item_4')}</li>
                            <li>{t('terms.usage_item_5')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.modifications_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.modifications_desc')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Scale size={24} color="var(--primary)" />
                            {t('terms.liability_title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.liability_desc')}
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: '2rem', marginTop: '1rem' }}>
                            <li>{t('terms.liability_item_1')}</li>
                            <li>{t('terms.liability_item_2')}</li>
                            <li>{t('terms.liability_item_3')}</li>
                            <li>{t('terms.liability_item_4')}</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.law_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.law_desc')}
                        </p>
                    </section>

                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.changes_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.changes_desc')}
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{t('terms.contact_title')}</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('terms.contact_desc')}
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
                        ← {t('terms.back_to_home')}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Terms;
