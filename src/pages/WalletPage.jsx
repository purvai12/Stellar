import React from 'react';
import PageTransition from '../components/PageTransition';
import { useNavigate } from 'react-router-dom';

const WalletPage = ({
    walletAddress,
    xlmBalance,
    loadingBalance,
    disconnectWallet,
    goalName,
    setGoalName,
    goalAmount,
    setGoalAmount,
    savedAmount,
    progressPercent,
    savedAddresses
}) => {
    const navigate = useNavigate();

    const handleSendTo = (address) => {
        navigate('/send', { state: { receiverAddress: address } });
    };

    return (
        <PageTransition>
            <div className="container">
                <h1 className="title">My Wallet</h1>

                {/* Wallet Info Card */}
                <div className="card">
                    <h2>Account Details</h2>
                    <div className="info">
                        <p><b>Address:</b></p>
                        <p className="address">{walletAddress}</p>
                    </div>

                    <div className="balanceBox">
                        <p>
                            <b>XLM Balance:</b>{" "}
                            {loadingBalance ? "Loading..." : `${xlmBalance} XLM`}
                        </p>
                    </div>

                    <button className="btn danger" onClick={disconnectWallet}>
                        Disconnect Wallet
                    </button>
                </div>

                {/* Savings Goal Card */}
                <div className="card">
                    <h2>Savings Goal</h2>
                    <div className="row">
                        <div className="inputBox">
                            <label>Goal Name</label>
                            <input
                                type="text"
                                value={goalName}
                                onChange={(e) => setGoalName(e.target.value)}
                            />
                        </div>
                        <div className="inputBox">
                            <label>Goal Amount (XLM)</label>
                            <input
                                type="number"
                                value={goalAmount}
                                onChange={(e) => setGoalAmount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="progressContainer">
                        <div className="progressText">
                            <p><b>Saved:</b> {savedAmount.toFixed(2)} XLM</p>
                            <p><b>Goal:</b> {goalAmount} XLM</p>
                        </div>
                        <div className="progressBar">
                            <div className="progressFill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="progressPercent">{progressPercent.toFixed(1)}% Completed</p>
                    </div>
                </div>

                {/* Quick Send from Address Book */}
                {savedAddresses.length > 0 && (
                    <div className="card">
                        <h2>Quick Send</h2>
                        <div className="historyList"> {/* Reusing list style */}
                            {savedAddresses.map((contact, index) => (
                                <div key={index} className="historyItem" style={{ justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontWeight: 'bold' }}>{contact.name}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                                            {contact.address.slice(0, 4)}...{contact.address.slice(-4)}
                                        </p>
                                    </div>
                                    <button
                                        className="btn primary"
                                        style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem', marginTop: 0 }}
                                        onClick={() => handleSendTo(contact.address)}
                                    >
                                        Send
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default WalletPage;
