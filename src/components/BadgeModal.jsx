import React from 'react';
import { fireConfetti } from '../hooks/useConfetti';

export default function BadgeModal({ badge, onClose, mode = "award" }) {
    if (!badge) return null;

    React.useEffect(() => {
        if (mode === 'award') fireConfetti('badge');
    }, [mode]);

    return (
        <div className="modal-backdrop badge-award-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ textAlign: 'center' }}>
                <div className="badge-award-icon">{badge.icon}</div>
                <div className="badge-award-title">
                    {mode === 'award' ? 'Badge Unlocked!' : badge.title}
                </div>
                {mode === 'award' && (
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 6 }}>{badge.title}</div>
                )}
                <div className="badge-award-desc">{badge.desc}</div>
                {mode === 'view' && badge.awardedAt && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 20 }}>
                        Earned on: {new Date(badge.awardedAt).toLocaleDateString()}
                    </div>
                )}
                <button className="btn btn-primary btn-full" onClick={onClose}>
                    {mode === 'award' ? 'Awesome!' : 'Close'}
                </button>
            </div>
        </div>
    );
}
