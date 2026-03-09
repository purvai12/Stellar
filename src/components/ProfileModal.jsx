import React, { useState } from 'react';

export default function ProfileModal({ profile, onClose, onSave }) {
    const [name, setName] = useState(profile.name || 'Saver');
    const [avatar, setAvatar] = useState(profile.avatar || '');

    const emojis = ['👽', '👾', '👻', '🤖', '🦊', '🦁', '🐸', '🦄', '🐲', '🚀', '⭐', '🔥'];

    const handleSave = () => {
        onSave({ name: name.trim() || 'Saver', avatar });
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 400 }}>
                <h2>Edit Profile</h2>
                <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Customize your identity on the Stellar network.</p>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Display Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        placeholder="Saver"
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Choose Avatar</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                        {emojis.map(emo => (
                            <div
                                key={emo}
                                onClick={() => setAvatar(emo)}
                                style={{
                                    fontSize: '2rem',
                                    cursor: 'pointer',
                                    padding: '5px',
                                    borderRadius: '50%',
                                    background: avatar === emo ? 'var(--accent-glow)' : 'transparent',
                                    border: avatar === emo ? '2px solid var(--accent)' : '2px solid transparent',
                                    transition: 'all 0.2s',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {emo}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
}
