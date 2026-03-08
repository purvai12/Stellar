import React, { useEffect, useState } from 'react';
import PageTransition from '../components/PageTransition';
import BadgeModal from '../components/BadgeModal';
import { getBadges, BADGE_TYPES } from '../hooks/useBadges';

export default function DashboardPage({ walletAddress, xlmBalance, rewardBalance, loadingBal, streakData }) {
    const [usdPrice, setUsdPrice] = useState(null);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const badges = getBadges(walletAddress);

    useEffect(() => {
        fetch('https://api.coinbase.com/v2/prices/XLM-USD/spot')
            .then(r => r.json())
            .then(d => setUsdPrice(parseFloat(d.data.amount)))
            .catch(console.error);
    }, []);

    const totalUsd = xlmBalance && usdPrice ? (xlmBalance * usdPrice).toFixed(2) : '0.00';

    return (
        <PageTransition>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Welcome back. Keep up the savings streak!</p>
            </div>

            <div className="grid-3 section">
                {/* Balance Card */}
                <div className="card">
                    <div className="card-title">XLM Balance</div>
                    <div className="card-value">{loadingBal ? '...' : xlmBalance}</div>
                    <div className="card-sub">≈ ${totalUsd} USD</div>
                </div>

                {/* Reward Token Card */}
                <div className="card" style={{ border: '1px solid #f59e0b', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)' }}>
                    <div className="card-title" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🪙 Custom Reward Tokens
                    </div>
                    <div className="card-value" style={{ color: '#f59e0b' }}>
                        {loadingBal ? '...' : rewardBalance} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>RTK</span>
                    </div>
                    <div className="card-sub">10% Savings Bonus</div>
                </div>

                {/* Price Card */}
                <div className="card">
                    <div className="card-title">XLM Market Price</div>
                    <div className="card-value">${usdPrice ? usdPrice.toFixed(4) : '...'}</div>
                    <div className="card-sub text-success">Live from Coinbase</div>
                </div>

                {/* Streak Card */}
                <div className="card">
                    <div className="card-title">Current Streak</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <div className="card-value">{streakData.streak}</div>
                        <span className="streak-pill">🔥 Days</span>
                    </div>
                    <div className="card-sub">
                        {streakData.lastSaved ? `Last saved: ${streakData.lastSaved}` : 'No saves yet'}
                    </div>
                </div>
            </div>

            <div className="section">
                <h2 className="section-title">Earned Badges</h2>
                <div className="badge-grid">
                    {Object.values(BADGE_TYPES).map(config => {
                        const earned = badges.find(b => b.id === config.id);
                        if (!earned) {
                            return (
                                <div key={config.id} className="badge-tile locked">
                                    <div className="badge-icon">🔒</div>
                                    <div className="badge-name">{config.title}</div>
                                    <div className="badge-desc">{config.desc}</div>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={config.id}
                                className="badge-tile earned"
                                onClick={() => setSelectedBadge(earned)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="badge-icon">{config.icon}</div>
                                <div className="badge-name" style={{ color: config.color }}>{config.title}</div>
                                <div className="badge-desc">{config.desc}</div>
                                <div className="badge-date">
                                    {new Date(earned.awardedAt).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="section" style={{ maxWidth: '400px' }}>
                <h2 className="section-title">Quick Actions</h2>
                <div className="card">
                    <p className="form-label" style={{ marginBottom: '12px' }}>Need some testnet XLM to play around?</p>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => window.open(`https://friendbot.stellar.org/?addr=${walletAddress}`, '_blank')}
                    >
                        Fund with Friendbot ↗
                    </button>
                </div>
            </div>

            {/* Selected Badge Modal */}
            {selectedBadge && (
                <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} mode="view" />
            )}
        </PageTransition>
    );
}
