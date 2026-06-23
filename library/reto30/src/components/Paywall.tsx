import React from 'react';
import { Crown, CheckCircle2, Star, Sparkles, ArrowRight } from 'lucide-react';
import { setPremiumStatus } from '../utils/progress';
import { useTranslation } from 'react-i18next';

interface PaywallProps {
    onPurchaseSuccess: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onPurchaseSuccess }) => {
    const { t } = useTranslation();
    const handlePurchase = () => {
        // En producción aquí iría la integración con Stripe o RevenueCat
        setPremiumStatus(true);
        onPurchaseSuccess();
    };

    return (
        <div className="fade-in" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '2rem auto',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    width: '70px',
                    height: '70px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    boxShadow: '0 10px 20px rgba(255, 215, 0, 0.2)'
                }}>
                    <Crown size={40} color="white" />
                </div>

                <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>{t('paywall.unlock_title')}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                    {t('paywall.unlock_desc')}
                </p>

                <div style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
                    {[
                        t('paywall.feature_1'),
                        t('paywall.feature_2'),
                        t('paywall.feature_3'),
                        t('paywall.feature_4'),
                        t('paywall.feature_5')
                    ].map((feature, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                            <CheckCircle2 size={18} color="#FFD700" />
                            <span style={{ fontSize: '0.95rem' }}>{feature}</span>
                        </div>
                    ))}
                </div>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    marginBottom: '2rem',
                    border: '1px solid var(--glass-border)'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{t('paywall.one_time_payment')}</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>€7.49</div>
                </div>

                <button
                    onClick={handlePurchase}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '1.2rem',
                        fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                        border: 'none',
                        color: 'black',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Sparkles size={20} />
                    {t('paywall.unlock_now')}
                    <ArrowRight size={20} />
                </button>

                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Star size={12} style={{ marginRight: '4px' }} />
                    {t('paywall.rating')}
                </p>
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {t('paywall.have_code')}
                </p>
                <PromoCodeSection onSuccess={onPurchaseSuccess} />

                <div style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6 }}>
                    <p>¿Problemas con la demo?</p>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        style={{ textDecoration: 'underline', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Restablecer Aplicación
                    </button>
                </div>
            </div>
        </div>
    );
};

const PromoCodeSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { t } = useTranslation();
    const [code, setCode] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [status, setStatus] = React.useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleRedeem = async () => {
        if (!code) return;
        setLoading(true);
        setStatus(null);

        // Dynamic import to avoid circular dependency issues if any
        const { validatePromoCode } = await import('../utils/codes');
        const result = await validatePromoCode(code);

        setLoading(false);
        if (result.success) {
            setStatus({ type: 'success', msg: result.message });
            setTimeout(onSuccess, 1500);
        } else {
            setStatus({ type: 'error', msg: result.message });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    placeholder={t('paywall.redeem_placeholder')}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--glass-border)',
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        color: 'white',
                        flex: 1,
                        textTransform: 'uppercase',
                        fontSize: '0.9rem'
                    }}
                />
                <button
                    onClick={handleRedeem}
                    disabled={loading}
                    style={{
                        background: 'var(--primary)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 1rem',
                        fontWeight: 'bold',
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? '...' : 'OK'}
                </button>
            </div>
            {status && (
                <p style={{
                    fontSize: '0.8rem',
                    color: status.type === 'success' ? '#4ade80' : '#ef4444',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {status.msg}
                </p>
            )}
        </div>
    );
};

export default Paywall;
