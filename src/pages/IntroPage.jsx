import React from 'react';
import PageTransition from '../components/PageTransition';

export default function IntroPage({ onOpenModal }) {
    return (
        <PageTransition>
            <div className="intro-page">
                <div className="intro-logo">✦</div>
                <h1 className="intro-title">
                    Welcome to <br />
                    <span>StellaSmart Saver</span>
                </h1>
                <p className="intro-sub">
                    A Web3 savings tracker. Set goals, maintain daily streaks, earn badges, and join the on-chain community to save together.
                </p>

                <div className="intro-cta">
                    <button className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '99px' }} onClick={onOpenModal}>
                        Connect Wallet
                    </button>
                </div>

                <div className="intro-features animate-in">
                    <div className="feature-card">
                        <div className="feature-icon">🛡️</div>
                        <div className="feature-name">On-Chain Goals</div>
                        <div className="feature-desc">Track multiple savings goals securely via Soroban smart contracts.</div>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🔥</div>
                        <div className="feature-name">Daily Streaks</div>
                        <div className="feature-desc">Build momentum by saving consistently every single day.</div>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🏆</div>
                        <div className="feature-name">NFT Badges</div>
                        <div className="feature-desc">Earn exclusive digital badges for hitting milestones and streaks.</div>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🌐</div>
                        <div className="feature-name">Community</div>
                        <div className="feature-desc">Join the leaderboard and view live on-chain activities.</div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
