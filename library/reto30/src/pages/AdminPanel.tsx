import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Plus, Copy, Check, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
    const navigate = useNavigate();
    const [partnerId, setPartnerId] = useState('PARTNER-01');
    const [count, setCount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);


    const downloadCSV = () => {
        // CSV Header - Optimized for Google Sheets import
        const headers = ['CODIGO', 'ESTADO', 'EMAIL CLIENTE', 'FECHA ENVIO', 'ID VENTAS'];

        // CSV Rows
        const rows = generatedCodes.map(code => [
            code,
            'DISPONIBLE',
            '',
            '',
            partnerId
        ]);

        // Combine
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create Blob and Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `codigos_${partnerId}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generateCodes = async () => {
        setLoading(true);
        const codes: string[] = [];
        const prefix = 'M30';
        const partnerPrefix = partnerId.split('-')[0].substring(0, 3).toUpperCase();

        // Firestore batch limit is 500
        const BATCH_SIZE = 500;

        try {
            // Check if user is authenticated (anonymous or otherwise) to fail fast if auth is missing
            const generatePromise = async () => {
                const totalBatches = Math.ceil(count / BATCH_SIZE);

                for (let b = 0; b < totalBatches; b++) {
                    const batch = writeBatch(db);
                    const currentBatchSize = Math.min(BATCH_SIZE, count - b * BATCH_SIZE);

                    for (let i = 0; i < currentBatchSize; i++) {
                        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
                        const code = `${prefix}-${partnerPrefix}-${suffix}`;

                        const codeRef = doc(collection(db, 'promo_codes'), code);
                        batch.set(codeRef, {
                            partnerId: partnerId,
                            createdAt: Date.now(),
                            redeemedBy: null,
                            redeemedAt: null,
                            isActive: true
                        });
                        codes.push(code);
                    }

                    await batch.commit();
                }

                return codes;
            };

            // Add a 30s timeout (longer for batches)
            const timeoutPromise = new Promise<string[]>((_, reject) =>
                setTimeout(() => reject(new Error("Tiempo de espera agotado.")), 30000)
            );

            const result = await Promise.race([generatePromise(), timeoutPromise]);
            setGeneratedCodes(result);

        } catch (error: any) {
            console.error("Error generating codes:", error);
            const msg = error?.message || error?.toString() || 'Error desconocido';
            alert(`Error generando códigos: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={18} /> Volver
            </button>

            <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

            <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>ID del Partner (Gimnasio)</label>
                    <input
                        type="text"
                        value={partnerId}
                        onChange={e => setPartnerId(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '8px', color: 'white' }}
                    />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad de códigos</label>
                    <input
                        type="number"
                        value={count}
                        onChange={e => setCount(parseInt(e.target.value))}
                        className="input-field"
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '8px', color: 'white' }}
                    />
                </div>

                <button
                    onClick={generateCodes}
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> {loading ? 'Generando...' : 'Generar Lote de Códigos'}
                </button>
            </div>

            {generatedCodes.length > 0 && (
                <div className="glass-card fade-in" style={{ marginTop: '2rem', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="text-xl font-bold">Códigos Generados</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={downloadCSV}
                                className="btn-primary"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                            >
                                <Download size={18} /> Descargar CSV
                            </button>
                            <button onClick={copyToClipboard} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#93c5fd' }}>
                        <strong>💡 Tip para Google Sheets:</strong> Al importar este archivo, selecciona la opción
                        <em> "Añadir a la hoja actual"</em> (Append to current sheet) para agregar los nuevos códigos sin borrar los anteriores.
                    </div>

                    <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.9rem', color: '#4ade80' }}>
                        {generatedCodes.join('\n')}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
