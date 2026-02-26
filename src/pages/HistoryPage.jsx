import React from 'react';
import PageTransition from '../components/PageTransition';

export default function HistoryPage({ transactions, onRefresh }) {
    return (
        <PageTransition>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="page-title">Transaction History</h1>
                    <p className="page-subtitle">Your recent on-chain transfers.</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↻ Refresh</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount (XLM)</th>
                            <th>Date & Time</th>
                            <th>Counterparty</th>
                            <th>Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                                    No recent transactions found.
                                </td>
                            </tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>
                                        {tx.type === 'received'
                                            ? <span className="chip chip-green">↓ Received</span>
                                            : <span className="chip chip-purple">↑ Sent</span>}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                                        {tx.date} <span style={{ opacity: 0.5 }}>{tx.time}</span>
                                    </td>
                                    <td className="mono" style={{ fontSize: '0.72rem' }}>
                                        {tx.counterparty ? `${tx.counterparty.slice(0, 6)}...${tx.counterparty.slice(-6)}` : '-'}
                                    </td>
                                    <td>
                                        <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="tx-link" style={{ fontSize: '0.72rem' }}>
                                            {tx.hash.slice(0, 8)}...
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </PageTransition>
    );
}
