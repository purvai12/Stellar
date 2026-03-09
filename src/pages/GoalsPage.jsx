import React, { useState, useEffect } from 'react';
import PageTransition from '../components/PageTransition';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit';
import { fireConfetti } from '../hooks/useConfetti';
import { awardBadge } from '../hooks/useBadges';

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const CONTRACT_ID = "CDGPV4NRFR4IG7QIM7IDED623IC5B6B2Q5GFUURRKUBSEGKKKWHQJFMX";
const sorobanServer = new StellarSdk.rpc.Server(RPC_URL);

const DEFAULT_GOALS = [
    { id: 'emergency', icon: '🛡️', name: 'Emergency Fund', target: 0, saved: 0, completed: false },
    { id: 'vacation', icon: '🏖️', name: 'Vacation', target: 0, saved: 0, completed: false },
    { id: 'laptop', icon: '💻', name: 'New Laptop', target: 0, saved: 0, completed: false },
    { id: 'education', icon: '📚', name: 'Education', target: 0, saved: 0, completed: false }
];

const getLocalGoals = (wallet) => {
    if (!wallet) return [];
    try {
        const raw = localStorage.getItem(`goals_list_${wallet}`);
        if (raw) return JSON.parse(raw);

        // Migration: If old object format exists, convert it. Otherwise return defaults.
        const oldObj = localStorage.getItem(`goals_${wallet}`);
        if (oldObj) {
            const parsed = JSON.parse(oldObj);
            const migrated = DEFAULT_GOALS.map(g => ({ ...g, ...parsed[g.id] }));
            localStorage.setItem(`goals_list_${wallet}`, JSON.stringify(migrated));
            return migrated;
        }
        return DEFAULT_GOALS;
    } catch { return DEFAULT_GOALS; }
};

export default function GoalsPage({ walletAddress, onSavingRecorded, onBadgeAwarded }) {
    const [goals, setGoals] = useState([]);
    const [activeGoal, setActiveGoal] = useState(null); // 'id-setup', 'id-add', 'id-extract'
    const [targetInput, setTargetInput] = useState('');
    const [addInput, setAddInput] = useState('');
    const [extractInput, setExtractInput] = useState('');
    const [status, setStatus] = useState('');
    // New goal state
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newGoalIcon, setNewGoalIcon] = useState('🎯');
    const [newGoalName, setNewGoalName] = useState('');

    const [error, setError] = useState('');

    useEffect(() => {
        setGoals(getLocalGoals(walletAddress));
    }, [walletAddress]);

    const saveLocalGoals = (newGoals) => {
        setGoals(newGoals);
        localStorage.setItem(`goals_list_${walletAddress}`, JSON.stringify(newGoals));
    };

    const handleSetTarget = (id) => {
        if (!targetInput || isNaN(targetInput) || Number(targetInput) <= 0) return;
        const updated = goals.map(g => g.id === id ? { ...g, target: Number(targetInput) } : g);
        saveLocalGoals(updated);
        setTargetInput('');
        setActiveGoal(null);
    };

    const handleDeleteGoal = (id) => {
        if (confirm("Are you sure you want to delete this goal? On-chain savings will remain on the contract but will no longer be tracked here.")) {
            saveLocalGoals(goals.filter(g => g.id !== id));
            setActiveGoal(null);
        }
    };

    const handleCreateNewGoal = () => {
        if (!newGoalName.trim()) { setError("Goal name is required"); return; }
        const newGoal = {
            id: `custom_${Date.now()}`,
            icon: newGoalIcon || '🎯',
            name: newGoalName.trim(),
            target: 0,
            saved: 0,
            completed: false
        };
        saveLocalGoals([...goals, newGoal]);
        setIsAddingNew(false);
        setNewGoalName('');
        setNewGoalIcon('🎯');
    };

    const classifyError = (err) => {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("rejected") || msg.includes("declined")) return "🚫 Transaction rejected.";
        if (msg.includes("not found") || msg.includes("404")) return "⚠️ Account unfunded on Testnet. Fund via Friendbot!";
        if (msg.includes("balance")) return "⚠️ Insufficient balance.";
        return "⚠️ Contract call failed: " + (err?.message || "Unknown Error");
    };

    const handleAddSavings = async (id) => {
        const parsedInput = Number(String(addInput).replace(',', '.'));
        if (!addInput || isNaN(parsedInput) || parsedInput <= 0) {
            setError("Enter a valid amount."); return;
        }
        try {
            setError(''); setStatus('building');
            const contract = new StellarSdk.Contract(CONTRACT_ID);
            const account = await sorobanServer.getAccount(walletAddress);
            const stroopsAmount = Math.floor(parsedInput * 10000000);
            const tx = new StellarSdk.TransactionBuilder(account, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call("add_savings", new StellarSdk.Address(walletAddress).toScVal(), StellarSdk.nativeToScVal(stroopsAmount, { type: "i128" })))
                .setTimeout(60).build();

            const sim = await sorobanServer.simulateTransaction(tx);
            if (sim.error) {
                console.error("Simulation failed:", sim.error);
                throw new Error("simulation incorrect");
            }
            const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();

            setStatus('signing');
            const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
                networkPassphrase: NETWORK_PASSPHRASE,
                accountToSign: walletAddress
            });
            if (!signedTxXdr) throw new Error("Signature rejected");
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

            setStatus('submitting');
            const submitRes = await sorobanServer.sendTransaction(signedTx);
            if (submitRes.errorResultXdr) throw new Error("Transaction rejected");

            let txStatus = await sorobanServer.getTransaction(submitRes.hash);
            while (txStatus.status === "NOT_FOUND" || txStatus.status === "PENDING") {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await sorobanServer.getTransaction(submitRes.hash);
            }
            if (txStatus.status !== "SUCCESS") throw new Error("On-chain validation failed");

            setStatus('success');

            const newGoals = goals.map(g => {
                if (g.id !== id) return g;
                const newSaved = g.saved + parsedInput;
                const isComplete = g.target > 0 && newSaved >= g.target;

                if (isComplete && !g.completed) {
                    fireConfetti('goal');
                    const badge = awardBadge(walletAddress, 'GOAL_COMPLETE');
                    if (badge && onBadgeAwarded) {
                        onBadgeAwarded({ ...badge, desc: `Completed: ${g.name}` });
                    }
                }

                return { ...g, saved: newSaved, completed: isComplete || g.completed };
            });

            saveLocalGoals(newGoals);

            // Triggers for main app
            onSavingRecorded(walletAddress);

            setAddInput('');
            setActiveGoal(null);
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setError(classifyError(err));
            setStatus('failed');
        }
    };

    const handleExtractSavings = async (id) => {
        if (!extractInput || isNaN(extractInput) || Number(extractInput) <= 0) return;

        // Handle European commas: "0,5" -> "0.5"
        const normalizedInput = extractInput.replace(',', '.');
        const parsedInput = parseFloat(normalizedInput);
        if (isNaN(parsedInput)) return;

        const goal = goals.find(g => g.id === id);
        if (!goal || goal.saved < parsedInput) {
            setError('Insufficient savings to extract that amount.');
            setStatus('failed');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        setError('');
        setStatus('building');

        try {
            const contract = new StellarSdk.Contract(CONTRACT_ID);
            const account = await sorobanServer.getAccount(walletAddress);
            const stroopsAmount = Math.floor(parsedInput * 10000000);
            const tx = new StellarSdk.TransactionBuilder(account, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(contract.call("extract_savings", new StellarSdk.Address(walletAddress).toScVal(), StellarSdk.nativeToScVal(stroopsAmount, { type: "i128" })))
                .setTimeout(60).build();

            const sim = await sorobanServer.simulateTransaction(tx);
            if (sim.error) {
                console.error("Simulation failed:", sim.error);
                throw new Error("simulation incorrect");
            }
            const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();

            setStatus('signing');
            const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
                networkPassphrase: NETWORK_PASSPHRASE,
                accountToSign: walletAddress
            });
            if (!signedTxXdr) throw new Error("Signature rejected");
            const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

            setStatus('submitting');
            const submitRes = await sorobanServer.sendTransaction(signedTx);
            if (submitRes.errorResultXdr) throw new Error("Transaction rejected");

            let txStatus = await sorobanServer.getTransaction(submitRes.hash);
            while (txStatus.status === "NOT_FOUND" || txStatus.status === "PENDING") {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await sorobanServer.getTransaction(submitRes.hash);
            }
            if (txStatus.status !== "SUCCESS") throw new Error("On-chain validation failed");

            setStatus('success');

            const newGoals = goals.map(g => {
                if (g.id !== id) return g;
                // If they pull out savings, they might un-complete the goal
                const newSaved = g.saved - parsedInput;
                const isComplete = g.target > 0 && newSaved >= g.target;
                return { ...g, saved: newSaved, completed: isComplete };
            });

            setGoals(newGoals);
            saveLocalGoals(newGoals);

            // Fetch generic balances using the passed down App level hook
            onSavingRecorded(walletAddress);

            setExtractInput('');
            setActiveGoal(null);
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setError(classifyError(err));
            setStatus('failed');
        }
    };

    return (
        <PageTransition>
            <div className="page-header">
                <h1 className="page-title">Savings Goals</h1>
                <p className="page-subtitle">Track your targeted savings. Every contribution is logged on the Soroban smart contract.</p>
            </div>

            {status && status !== 'success' && status !== 'failed' && (
                <div className="status-banner pending animate-in" style={{ marginBottom: 20 }}>
                    {status === 'building' && '⏳ Building transaction...'}
                    {status === 'signing' && '✍️ Waiting for wallet signature...'}
                    {status === 'submitting' && '📡 Submitting to Soroban network...'}
                </div>
            )}
            {status === 'failed' && <div className="error-box" style={{ marginBottom: 20 }}>{error}</div>}
            {status === 'success' && <div className="status-banner success animate-in" style={{ marginBottom: 20 }}>✅ On-chain transaction successful!</div>}

            <div className="grid-2">
                {goals.map(g => {
                    const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
                    return (
                        <div className="card goal-card" key={g.id}>
                            <div className="goal-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="goal-icon">{g.icon}</div>
                                    <div>
                                        <div className="goal-name">{g.name}</div>
                                        {g.completed && <span className="goal-complete-badge">✓ Completed</span>}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 8px', color: 'var(--danger)', border: 'none' }}
                                    onClick={() => handleDeleteGoal(g.id)}
                                    title="Delete Goal"
                                    disabled={!!status}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="progress-wrap">
                                <div className="progress-info">
                                    <span>{g.saved} XLM / {g.target || '??'} XLM</span>
                                    <span>{pct.toFixed(0)}%</span>
                                </div>
                                <div className="progress-track">
                                    <div className={`progress-fill ${g.completed ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>

                            {activeGoal === `${g.id}-setup` ? (
                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <input type="number" placeholder="Target XLM" value={targetInput} onChange={e => setTargetInput(e.target.value)} disabled={!!status} />
                                    <button className="btn btn-primary" onClick={() => handleSetTarget(g.id)} disabled={!!status}>Set</button>
                                    <button className="btn btn-ghost" onClick={() => setActiveGoal(null)} disabled={!!status}>Cancel</button>
                                </div>
                            ) : activeGoal === `${g.id}-add` ? (
                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <input type="number" placeholder="Add XLM" value={addInput} onChange={e => setAddInput(e.target.value)} disabled={!!status} />
                                    <button className="btn btn-primary" onClick={() => handleAddSavings(g.id)} disabled={!!status}>Save</button>
                                    <button className="btn btn-ghost" onClick={() => setActiveGoal(null)} disabled={!!status}>Cancel</button>
                                </div>
                            ) : activeGoal === `${g.id}-extract` ? (
                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <input type="number" placeholder="Extract XLM" value={extractInput} onChange={e => setExtractInput(e.target.value)} disabled={!!status} />
                                    <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={() => handleExtractSavings(g.id)} disabled={!!status}>Withdraw</button>
                                    <button className="btn btn-ghost" onClick={() => setActiveGoal(null)} disabled={!!status}>Cancel</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setActiveGoal(`${g.id}-setup`); setTargetInput(g.target || ''); }} disabled={!!status}>
                                        {g.target > 0 ? 'Edit Target' : 'Set Target'}
                                    </button>
                                    {g.target > 0 && !g.completed && (
                                        <button className="btn btn-primary btn-sm" onClick={() => { setActiveGoal(`${g.id}-add`); setAddInput(''); }} disabled={!!status}>
                                            + Add Savings
                                        </button>
                                    )}
                                    {g.saved > 0 && (
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { setActiveGoal(`${g.id}-extract`); setExtractInput(''); }} disabled={!!status}>
                                            - Extract
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Create New Goal Card */}
                <div className="card goal-card" style={{ borderStyle: 'dashed', borderColor: 'var(--muted)', background: 'transparent' }}>
                    {isAddingNew ? (
                        <div>
                            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Create Custom Goal</h3>
                            <div className="form-group">
                                <label className="form-label">Emoji Icon</label>
                                <input type="text" maxLength="2" value={newGoalIcon} onChange={e => setNewGoalIcon(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Goal Name</label>
                                <input type="text" placeholder="e.g. New Car" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button className="btn btn-primary btn-full" onClick={handleCreateNewGoal}>Create</button>
                                <button className="btn btn-ghost btn-full" onClick={() => setIsAddingNew(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '160px', cursor: 'pointer', color: 'var(--muted)' }}
                            onClick={() => setIsAddingNew(true)}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>+</div>
                            <div style={{ fontWeight: 600 }}>Create New Goal</div>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
