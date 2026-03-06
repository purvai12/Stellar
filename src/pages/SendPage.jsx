import React from 'react';
import PageTransition from '../components/PageTransition';

export default function SendPage({
    walletAddress,
    receiverAddr,
    setReceiverAddr,
    sendAmount,
    setSendAmount,
    sendXLM,
    txStatus,
    txHash,
    error,
    savedAddresses,
    saveAddress,
    editAddress,
    deleteAddress
}) {
    const isBusy = txStatus === 'pending' || txStatus === 'signing' || txStatus === 'submitting';

    const [newAlias, setNewAlias] = React.useState('');
    const [newAddr, setNewAddr] = React.useState('');
    const [editingAddr, setEditingAddr] = React.useState(null); // original address of the row being edited
    const [editAlias, setEditAlias] = React.useState('');
    const [editAddrInput, setEditAddrInput] = React.useState('');

    const handleSaveContact = () => {
        if (newAlias && newAddr) {
            saveAddress(newAlias, newAddr);
            setNewAlias('');
            setNewAddr('');
        }
    };

    const startEdit = (e, contact) => {
        e.stopPropagation();
        setEditingAddr(contact.address);
        setEditAlias(contact.name);
        setEditAddrInput(contact.address);
    };

    const saveEdit = (e) => {
        e.stopPropagation();
        if (editAlias && editAddrInput) {
            editAddress(editingAddr, editAlias, editAddrInput);
            setEditingAddr(null);
        }
    };

    const handleDelete = (e, addr) => {
        e.stopPropagation();
        if (confirm('Delete this saved address?')) {
            deleteAddress(addr);
        }
    };

    return (
        <PageTransition>
            <div className="page-header">
                <h1 className="page-title">Send XLM</h1>
                <p className="page-subtitle">Transfer funds directly on the Stellar testnet.</p>
            </div>

            <div className="grid-2">
                <div className="card">
                    <h2 className="section-title" style={{ fontSize: '1rem', color: 'var(--text)' }}>Transfer Form</h2>
                    <div className="form-group" style={{ marginTop: 24 }}>
                        <label className="form-label">Recipient Address</label>
                        <input
                            type="text"
                            placeholder="G..."
                            value={receiverAddr}
                            onChange={e => setReceiverAddr(e.target.value)}
                            disabled={isBusy}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Amount (XLM)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={sendAmount}
                            onChange={e => setSendAmount(e.target.value)}
                            disabled={isBusy}
                        />
                    </div>
                    <button
                        className="btn btn-primary btn-full animate-in"
                        onClick={sendXLM}
                        disabled={isBusy}
                        style={{ marginTop: 16 }}
                    >
                        {isBusy ? 'Processing Transfer...' : 'Confirm and Send'}
                    </button>

                    {txStatus && txStatus !== 'success' && txStatus !== 'failed' && (
                        <div className="status-banner pending animate-in">
                            {txStatus === 'pending' && '⏳ Building transaction...'}
                            {txStatus === 'signing' && '✍️ Waiting for wallet signature...'}
                            {txStatus === 'submitting' && '📡 Submitting to Stellar network...'}
                        </div>
                    )}
                    {txStatus === 'success' && (
                        <div className="status-banner success animate-in">
                            <div style={{ flex: 1 }}>
                                ✅ Transfer Successful!
                                <div style={{ marginTop: 6 }}><a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="tx-link">View on Stellar Expert ↗</a></div>
                            </div>
                        </div>
                    )}
                    {error && <div className="error-box animate-in">{error}</div>}
                </div>

                <div className="card">
                    <h2 className="section-title" style={{ fontSize: '1rem', color: 'var(--text)' }}>Address Book</h2>

                    <div className="form-row" style={{ marginTop: 24, marginBottom: 24 }}>
                        <input type="text" placeholder="Alias (e.g. Alice)" value={newAlias} onChange={e => setNewAlias(e.target.value)} disabled={isBusy} />
                        <input type="text" placeholder="G..." value={newAddr} onChange={e => setNewAddr(e.target.value)} disabled={isBusy} />
                        <button className="btn btn-ghost" onClick={handleSaveContact} disabled={isBusy || !newAlias || !newAddr}>Add</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {savedAddresses.length === 0 && <p className="form-label">No saved addresses.</p>}
                        {savedAddresses.map((contact, i) => (
                            <div
                                key={i}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => !isBusy && setReceiverAddr(contact.address)}
                                className="hover-card"
                            >
                                {editingAddr === contact.address ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }} onClick={e => e.stopPropagation()}>
                                        <input type="text" value={editAlias} onChange={e => setEditAlias(e.target.value)} />
                                        <input type="text" value={editAddrInput} onChange={e => setEditAddrInput(e.target.value)} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingAddr(null)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{contact.name}</div>
                                            <div className="mono" style={{ fontSize: '0.72rem' }}>{contact.address.slice(0, 8)}...{contact.address.slice(-8)}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} onClick={(e) => startEdit(e, contact)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px', color: 'var(--danger)' }} onClick={(e) => handleDelete(e, contact.address)}>✕</button>
                                            <div className="form-label" style={{ marginLeft: 8 }}>Use ↗</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
