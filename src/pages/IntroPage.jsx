import React from 'react';
import PageTransition from '../components/PageTransition';

const IntroPage = ({ connectWallet, error }) => {
    return (
        <PageTransition>
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1 className="title">Stellar Savings Goal Tracker</h1>
                <p className="subtitle">Track your savings goals with us!</p>

                <div className="card">
                    <h2>Welcome!</h2>
                    <p style={{ marginBottom: '20px' }}>
                        Connect your Freighter wallet to start tracking your savings and managing your XLM.
                    </p>
                    <button className="btn primary" onClick={connectWallet}>
                        Connect Freighter Wallet
                    </button>
                </div>

                {error && (
                    <div className="errorBox">
                        <p>⚠ {error}</p>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default IntroPage;
