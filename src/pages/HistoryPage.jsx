import React from 'react';
import PageTransition from '../components/PageTransition';

const HistoryPage = ({ transactions }) => {
    return (
        <PageTransition>
            <div className="container">
                <h1 className="title">History</h1>

                <div className="card">
                    <h2>Recent Transactions</h2>
                    {transactions.length === 0 ? (
                        <p style={{ textAlign: 'center', opacity: 0.6 }}>No transactions found.</p>
                    ) : (
                        <div className="historyList">
                            {transactions.map((tx, index) => (
                                <div
                                    key={tx.id}
                                    className="historyItem"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className={`historyIcon ${tx.type}`}>
                                        {tx.type === 'received' ? '↓' : '↑'}
                                    </div>
                                    <div className="historyDetails">
                                        <p className="historyType">{tx.type === 'received' ? 'Received' : 'Sent'}</p>
                                        <p className="historyDate">{tx.date} • {tx.time}</p>
                                    </div>
                                    <div className={`historyAmount ${tx.type}`}>
                                        {tx.type === 'received' ? '+' : '-'}{tx.amount} XLM
                                    </div>
                                    <a
                                        href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="historyLink"
                                        title="View on Stellar Expert"
                                    >
                                        🔗
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default HistoryPage;
