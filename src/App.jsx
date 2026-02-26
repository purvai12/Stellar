import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes, Route, Navigate,
} from 'react-router-dom';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarWalletsKit, Networks } from '@creit-tech/stellar-wallets-kit';
import { FreighterModule } from '@creit-tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit-tech/stellar-wallets-kit/modules/albedo';
import { LobstrModule } from '@creit-tech/stellar-wallets-kit/modules/lobstr';

import Sidebar from './components/Sidebar';
import BadgeModal from './components/BadgeModal';
import IntroPage from './pages/IntroPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import CommunityPage from './pages/CommunityPage';
import SendPage from './pages/SendPage';
import HistoryPage from './pages/HistoryPage';
import OnChainSavings from './pages/OnChainSavings';

import { recordSavingToday, getStreakData } from './hooks/useStreak';
import { getBadges, awardBadge, checkAndAwardStreakBadges } from './hooks/useBadges';

const HORIZON = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// ─── Error classifier ─────────────────────────────────────────────────────
const classify = (err, ctx = '') => {
  const m = (err?.message || '').toLowerCase();
  const codes = err?.response?.data?.extras?.result_codes;
  if (m.includes('not installed') || m.includes('freighter') && m.includes('not') || m.includes('extension not found'))
    return '❌ Freighter wallet not found. Please install the extension.';
  if (m.includes('rejected') || m.includes('declined') || m.includes('denied'))
    return '🚫 You rejected the request. Please approve it in your wallet.';
  if (codes?.operations?.includes('op_underfunded') || m.includes('underfunded') || m.includes('insufficient'))
    return '💸 Insufficient balance. Fund via Stellar Friendbot.';
  return ctx === 'send'
    ? '⚠️ Transaction failed. Check the recipient address and try again.'
    : '⚠️ Something went wrong. Please try again.';
};

export default function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [xlmBalance, setXlmBalance] = useState(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [sendStatus, setSendStatus] = useState('');
  const [sendHash, setSendHash] = useState('');
  const [sendError, setSendError] = useState('');
  const [receiverAddr, setReceiverAddr] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [newBadge, setNewBadge] = useState(null); // badge award popup
  const [streakData, setStreakData] = useState({ streak: 0 });

  // Load saved addresses + streak on wallet change
  useEffect(() => {
    // Initialize V3 API
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: 'freighter',
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new LobstrModule()
      ],
    });

    if (!walletAddress) return;
    const saved = localStorage.getItem('stellarAddresses');
    if (saved) setSavedAddresses(JSON.parse(saved));
    setStreakData(getStreakData(walletAddress));
  }, [walletAddress]);

  // ── Fetch balance & transactions ─────────────────────────────────────────
  const fetchBalance = useCallback(async (pk) => {
    try {
      setLoadingBal(true);
      const acct = await HORIZON.loadAccount(pk);
      const xlm = acct.balances.find(b => b.asset_type === 'native');
      setXlmBalance(xlm ? parseFloat(xlm.balance).toFixed(2) : '0.00');
      // fetch payments
      const resp = await HORIZON.payments().forAccount(pk).limit(15).order('desc').call();
      const payments = resp.records
        .filter(r => r.type === 'payment' && r.asset_type === 'native')
        .map(r => ({
          id: r.id,
          type: r.to === pk ? 'received' : 'sent',
          amount: parseFloat(r.amount).toFixed(2),
          date: new Date(r.created_at).toLocaleDateString(),
          time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hash: r.transaction_hash,
          counterparty: r.to === pk ? r.from : r.to,
        }));

      // fetch operations (to catch soroban invokeHostFunction)
      const opResp = await HORIZON.operations().forAccount(pk).limit(15).order('desc').call();
      const invocations = opResp.records
        .filter(r => r.type === 'invoke_host_function')
        .map(r => ({
          id: r.id,
          type: 'sent', // Smart contract invocations generally cost gas/funds from caller
          amount: 'Contract Call', // No clean way to parse abstract parameters here immediately
          date: new Date(r.created_at).toLocaleDateString(),
          time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hash: r.transaction_hash,
          counterparty: r.source_account,
        }));

      // Merge and sort
      const merged = [...payments, ...invocations].sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)).slice(0, 15);

      setTransactions(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBal(false);
    }
  }, []);

  // ── Connect wallet (called after modal picks address) ────────────────────
  const handleConnect = async () => {
    try {
      const { address } = await StellarWalletsKit.authModal();
      setWalletAddress(address);
      await fetchBalance(address);
      awardBadge(address, 'FIRST_SAVE');
    } catch (e) {
      console.error(e);
    }
  };

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnectWallet = () => {
    setWalletAddress('');
    setXlmBalance(null);
    setTransactions([]);
    setSendStatus('');
    setSendHash('');
    setSendError('');
  };

  // ── Send XLM ─────────────────────────────────────────────────────────────
  const sendXLM = async () => {
    try {
      setSendError(''); setSendStatus(''); setSendHash('');
      if (!walletAddress) { setSendError('Connect your wallet first.'); return; }
      if (!receiverAddr.trim()) { setSendError('Enter a recipient address.'); return; }
      if (!sendAmount || isNaN(sendAmount) || +sendAmount <= 0) { setSendError('Enter a valid amount.'); return; }

      const dest = receiverAddr.trim();
      const amount = parseFloat(sendAmount).toFixed(7);
      setSendStatus('pending');
      const acct = await HORIZON.loadAccount(walletAddress);
      const fee = await HORIZON.fetchBaseFee();
      const tx = new StellarSdk.TransactionBuilder(acct, {
        fee: fee.toString(),
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.payment({ destination: dest, asset: StellarSdk.Asset.native(), amount }))
        .setTimeout(60).build();

      setSendStatus('signing');
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(tx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
      if (!signedTxXdr) { setSendError('🚫 Signature rejected.'); setSendStatus('failed'); return; }

      setSendStatus('submitting');
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, StellarSdk.Networks.TESTNET);
      const result = await HORIZON.submitTransaction(signedTx);
      setSendStatus('success');
      setSendHash(result.hash);
      setSendAmount('');
      await fetchBalance(walletAddress);
    } catch (err) {
      console.error(err);
      setSendError(classify(err, 'send'));
      setSendStatus('failed');
    }
  };

  // ── Save address ─────────────────────────────────────────────────────────
  const saveAddress = (name, addr) => {
    const updated = [...savedAddresses, { name, address: addr }];
    setSavedAddresses(updated);
    localStorage.setItem('saved_addresses', JSON.stringify(updated));
  };

  const editAddress = (oldAddr, newName, newAddr) => {
    const updated = savedAddresses.map(contact =>
      contact.address === oldAddr ? { name: newName, address: newAddr } : contact
    );
    setSavedAddresses(updated);
    localStorage.setItem('saved_addresses', JSON.stringify(updated));
  };

  const deleteAddress = (addr) => {
    const updated = savedAddresses.filter(contact => contact.address !== addr);
    setSavedAddresses(updated);
    localStorage.setItem('saved_addresses', JSON.stringify(updated));
  };

  // ── Called from GoalsPage when savings recorded ──────────────────────────
  const onSavingRecorded = (wallet) => {
    const updated = recordSavingToday(wallet);
    if (!updated) return;
    setStreakData(updated);
    const awarded = checkAndAwardStreakBadges(wallet, updated.streak);
    if (awarded.length > 0) setNewBadge(awarded[0]);
  };

  const isConnectedWallet = !!walletAddress;

  return (
    <Router>
      <div className="app-shell">
        {/* Animated Background Watermarks */}
        <div className="watermark wm-1">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="watermark wm-2">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <div className="watermark wm-3">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div className="watermark wm-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="watermark wm-5">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
          </svg>
        </div>
        <div className="watermark wm-6">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12h.01" />
          </svg>
        </div>
        <div className="watermark wm-7">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>

        {/* Badge Award Modal */}
        {newBadge && (
          <BadgeModal badge={newBadge} onClose={() => setNewBadge(null)} />
        )}

        {isConnectedWallet && (
          <Sidebar walletAddress={walletAddress} disconnectWallet={disconnectWallet} />
        )}

        <div className={isConnectedWallet ? 'main' : ''}>
          <Routes>
            <Route
              path="/"
              element={
                isConnectedWallet
                  ? <Navigate to="/dashboard" replace />
                  : <IntroPage onOpenModal={handleConnect} />
              }
            />
            <Route path="/dashboard" element={isConnectedWallet
              ? <DashboardPage
                walletAddress={walletAddress}
                xlmBalance={xlmBalance}
                loadingBal={loadingBal}
                streakData={streakData}
                transactions={transactions}
                onRefresh={() => fetchBalance(walletAddress)}
              />
              : <Navigate to="/" replace />}
            />
            <Route path="/goals" element={isConnectedWallet
              ? <GoalsPage
                walletAddress={walletAddress}
                onSavingRecorded={onSavingRecorded}
                onBadgeAwarded={setNewBadge}
              />
              : <Navigate to="/" replace />}
            />
            <Route path="/community" element={isConnectedWallet
              ? <CommunityPage
                walletAddress={walletAddress}
                streakData={streakData}
                onBadgeAwarded={setNewBadge}
              />
              : <Navigate to="/" replace />}
            />
            <Route path="/send" element={isConnectedWallet
              ? <SendPage
                walletAddress={walletAddress}
                receiverAddr={receiverAddr}
                setReceiverAddr={setReceiverAddr}
                sendAmount={sendAmount}
                setSendAmount={setSendAmount}
                sendXLM={sendXLM}
                txStatus={sendStatus}
                txHash={sendHash}
                error={sendError}
                savedAddresses={savedAddresses}
                saveAddress={saveAddress}
                editAddress={editAddress}
                deleteAddress={deleteAddress}
              />
              : <Navigate to="/" replace />}
            />
            <Route path="/history" element={isConnectedWallet
              ? <HistoryPage transactions={transactions} onRefresh={() => fetchBalance(walletAddress)} />
              : <Navigate to="/" replace />}
            />
            <Route path="/onchain" element={isConnectedWallet
              ? <OnChainSavings walletAddress={walletAddress} />
              : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
