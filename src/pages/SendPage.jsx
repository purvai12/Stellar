import React, { useEffect, useState } from 'react';
import PageTransition from '../components/PageTransition';
import { useLocation } from 'react-router-dom';

const SendPage = ({
    receiverAddress,
    setReceiverAddress,
    sendAmount,
    setSendAmount,
    sendXLM,
    txStatus,
    txHash,
    savedAddresses,
    showAddressModal,
    setShowAddressModal,
    newContactName,
    setNewContactName,
    saveAddress,
    error
}) => {
    const location = useLocation();

    // Pre-fill address if passed via navigation state
    useEffect(() => {
        if (location.state?.receiverAddress) {
            setReceiverAddress(location.state.receiverAddress);
        }
    }, [location, setReceiverAddress]);

    const handleSelectAddress = (e) => {
        const selected = e.target.value;
        if (selected) {
            setReceiverAddress(selected);
        }
    };

    return (
        <PageTransition>
            <div className="container">
                <h1 className="title">Send XLM</h1>

                <div className="card">
                    <h2>Send Transaction</h2>

                    <div className="inputBox">
                        <label>Recipient Address</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                                value={receiverAddress}
                                onChange={(e) => setReceiverAddress(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn primary"
                                style={{ width: 'auto', marginTop: 0, padding: '10px' }}
                                onClick={() => setShowAddressModal(true)}
                                title="Save Address"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Address Book Selector */}
                    {savedAddresses.length > 0 && (
                        <div className="inputBox">
                            <label>Or select from Address Book</label>
                            <select onChange={handleSelectAddress} defaultValue="">
                                <option value="" disabled>Select a contact...</option>
                                {savedAddresses.map((contact, index) => (
                                    <option key={index} value={contact.address}>
                                        {contact.name} ({contact.address.slice(0, 4)}...{contact.address.slice(-4)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Add Address Modal */}
                    {showAddressModal && (
                        <div className="inputBox" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                            <label>Save Current Address as:</label>
                            <input
                                type="text"
                                placeholder="Contact Name"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn success" style={{ marginTop: 0 }} onClick={saveAddress}>Save</button>
                                <button className="btn danger" style={{ marginTop: 0 }} onClick={() => setShowAddressModal(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    <div className="inputBox">
                        <label>Amount (XLM)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                        />
                    </div>

                    <button className="btn success" onClick={sendXLM}>
                        Send XLM
                    </button>

                    {txStatus && (
                        <div className="statusBox">
                            <p>{txStatus}</p>
                        </div>
                    )}

                    {txHash && (
                        <div className="hashBox">
                            <p><b>Transaction Hash:</b></p>
                            <p className="hash">{txHash}</p>
                            <a
                                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View on Stellar Expert
                            </a>
                        </div>
                    )}

                    {error && (
                        <div className="errorBox">
                            <p>⚠ {error}</p>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default SendPage;
