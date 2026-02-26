import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../components/PageTransition';
import * as StellarSdk from '@stellar/stellar-sdk';
import { awardBadge, hasBadge } from '../hooks/useBadges';

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CB2QEUXSE7JNVZQIFQLTWWMTNYZFMYBUEJTHBNPBJRYU2OGRCS66K65P";
const sorobanServer = new StellarSdk.rpc.Server(RPC_URL);

// Mock community addresses (we'll also add the connected user if they "join")
const INITIAL_MEMBERS = [
    "GBVG2QEXO2J...7T77Y",
    "GCR34N2...V3A5R",
    "GDU...K291E"
];

export default function CommunityPage({ walletAddress, streakData, onBadgeAwarded }) {
    const [members, setMembers] = useState([]);
    const [hasJoined, setHasJoined] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadCommunityFromStorage = useCallback(() => {
        try {
            const raw = localStorage.getItem('savings_community');
            if (raw) return JSON.parse(raw);
            return [];
        } catch { return []; }
    }, []);

    const saveCommunityToStorage = (list) => {
        localStorage.setItem('savings_community', JSON.stringify(list));
    };

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        try {
            const contract = new StellarSdk.Contract(CONTRACT_ID);
            const communityList = loadCommunityFromStorage();

            const promises = communityList.map(async (address) => {
                try {
                    const tx = new StellarSdk.TransactionBuilder(await sorobanServer.getAccount(address), { fee: "100", networkPassphrase: StellarSdk.Networks.TESTNET })
                        .addOperation(contract.call("get_saved", new StellarSdk.Address(address).toScVal()))
                        .setTimeout(60).build();
                    const sim = await sorobanServer.simulateTransaction(tx);
                    const val = sim.result?.retval;
                    const parsedVal = val ? StellarSdk.scValToNative(val).toString() : "0";
                    return { address, saved: Number(parsedVal) };
                } catch {
                    // If simulation fails (e.g. account unfunded/not initialized on contract) return 0
                    return { address, saved: 0 };
                }
            });

            const results = await Promise.all(promises);
            results.sort((a, b) => b.saved - a.saved);
            setMembers(results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [loadCommunityFromStorage]);

    useEffect(() => {
        const comm = loadCommunityFromStorage();
        if (comm.includes(walletAddress)) setHasJoined(true);
        fetchLeaderboard();
        const int = setInterval(fetchLeaderboard, 10000); // 10s auto-refresh
        return () => clearInterval(int);
    }, [walletAddress, fetchLeaderboard, loadCommunityFromStorage]);

    const handleJoin = () => {
        const comm = loadCommunityFromStorage();
        if (!comm.includes(walletAddress)) {
            const updated = [...comm, walletAddress];
            saveCommunityToStorage(updated);
            setHasJoined(true);
            if (!hasBadge(walletAddress, 'COMMUNITY_JOIN')) {
                const badge = awardBadge(walletAddress, 'COMMUNITY_JOIN');
                if (badge && onBadgeAwarded) onBadgeAwarded(badge);
            }
            fetchLeaderboard();
        }
    };

    return (
        <PageTransition>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Community Leaderboard</h1>
                    <p className="page-subtitle">Compare your on-chain savings with the network.</p>
                </div>
                {!hasJoined ? (
                    <button className="btn btn-primary animate-in" onClick={handleJoin} disabled={loading}>
                        Join the Leaderboard
                    </button>
                ) : (
                    <div className="chip chip-purple animate-in">Joined ✓</div>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th style={{ width: 80 }}>Rank</th>
                            <th>Member (Wallet)</th>
                            <th style={{ textAlign: 'right' }}>Total Saved (XLM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && members.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                                    📡 Fetching live on-chain balances...
                                </td>
                            </tr>
                        )}
                        {!loading && members.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                                    No one has joined the community yet. Be the first!
                                </td>
                            </tr>
                        )}
                        {members.map((m, i) => {
                            const isMe = m.address === walletAddress;
                            const shortAddr = `${m.address.slice(0, 5)}...${m.address.slice(-4)}`;
                            let medal = '';
                            if (i === 0 && m.saved > 0) medal = '🥇';
                            else if (i === 1 && m.saved > 0) medal = '🥈';
                            else if (i === 2 && m.saved > 0) medal = '🥉';

                            return (
                                <tr key={m.address} style={{ background: isMe ? 'var(--accent-dim)' : 'transparent' }}>
                                    <td>
                                        {medal ? <span className="rank-medal">{medal}</span> : <span className="rank-num">#{i + 1}</span>}
                                    </td>
                                    <td>
                                        <span className="address-chip" style={{ borderColor: isMe ? 'var(--accent-glow)' : 'var(--border)' }}>
                                            {shortAddr}
                                        </span>
                                        {isMe && <span className="chip chip-green" style={{ marginLeft: 10 }}>You</span>}
                                        {isMe && streakData?.streak > 0 && <span className="streak-pill" style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: 8, background: 'transparent' }}>🔥 {streakData.streak}</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {m.saved}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </PageTransition>
    );
}
