import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { setAllowed, signTransaction, getAddress, isConnected } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import { AnimatePresence } from "framer-motion";

// Components
import IntroPage from "./pages/IntroPage";
import WalletPage from "./pages/WalletPage";
import SendPage from "./pages/SendPage";
import HistoryPage from "./pages/HistoryPage";
import NavBar from "./components/NavBar";
import OnChainSavings from "./pages/OnChainSavings";


const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// ─── Error Classification Helper ─────────────────────────────────────────────
const classifyError = (err, context = "") => {
  const msg = (err?.message || "").toLowerCase();
  const code = err?.response?.data?.extras?.result_codes;

  // 1. Wallet not found / Freighter not installed
  if (
    msg.includes("freighter") && msg.includes("not") ||
    msg.includes("extension not found") ||
    msg.includes("not installed") ||
    msg.includes("wallet not found") ||
    msg.includes("no freighter")
  ) {
    return "❌ Error: Freighter wallet not found. Please install the Freighter browser extension and try again.";
  }

  // 2. User rejected / denied the request
  if (
    msg.includes("user declined") ||
    msg.includes("user rejected") ||
    msg.includes("rejected") ||
    msg.includes("denied") ||
    msg.includes("cancelled") ||
    msg.includes("user did not approve")
  ) {
    return "🚫 Error: You rejected the request. Please approve it in Freighter to continue.";
  }

  // 3. Insufficient balance
  if (
    (code && (code.operations?.includes("op_underfunded") || code.transaction?.includes("insufficient_balance"))) ||
    msg.includes("underfunded") ||
    msg.includes("insufficient") ||
    msg.includes("not enough")
  ) {
    return "💸 Error: Insufficient balance. Please fund your account using the Stellar Friendbot.";
  }

  // Generic fallbacks per context
  if (context === "connect") {
    return "⚠️ Wallet connection failed. Make sure Freighter is installed and unlocked.";
  }
  if (context === "send") {
    return "⚠️ Transaction failed. Make sure the recipient account exists and is funded on Stellar Testnet.";
  }
  return "⚠️ An unexpected error occurred. Please try again.";
};

// Inner App component to use Router hooks
const AnimatedRoutes = () => {
  const location = useLocation();

  // --- STATE ---
  const [walletAddress, setWalletAddress] = useState("");
  const [xlmBalance, setXlmBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [goalName, setGoalName] = useState("My Savings Goal");
  const [goalAmount, setGoalAmount] = useState(100);
  const [savedAmount, setSavedAmount] = useState(0);
  const [receiverAddress, setReceiverAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState("light");

  // Address Book State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newContactName, setNewContactName] = useState("");

  // --- EFFECTS ---
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    const saved = localStorage.getItem("stellarAddresses");
    if (saved) {
      setSavedAddresses(JSON.parse(saved));
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // --- ACTIONS ---
  const saveAddress = () => {
    if (!receiverAddress || !newContactName) return;
    const newContact = { name: newContactName, address: receiverAddress };
    const updated = [...savedAddresses, newContact];
    setSavedAddresses(updated);
    localStorage.setItem("stellarAddresses", JSON.stringify(updated));
    setNewContactName("");
    setShowAddressModal(false);
  };

  const fetchTransactions = async (publicKey) => {
    try {
      const resp = await server.payments().forAccount(publicKey).limit(10).order("desc").call();
      const records = resp.records;
      const formatted = records
        .filter(r => r.type === 'payment' && r.asset_type === 'native')
        .map(r => ({
          id: r.id,
          type: r.to === publicKey ? 'received' : 'sent',
          amount: parseFloat(r.amount).toFixed(2),
          date: new Date(r.created_at).toLocaleDateString(),
          time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hash: r.transaction_hash,
          counterparty: r.to === publicKey ? r.from : r.to
        }));
      setTransactions(formatted);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const fetchBalance = async (publicKey) => {
    try {
      setLoadingBalance(true);
      setError("");
      const cleanKey = publicKey.trim();
      const account = await server.loadAccount(cleanKey);
      const xlm = account.balances.find((bal) => bal.asset_type === "native");
      if (!xlm) {
        setXlmBalance("0.00");
        return;
      }
      setXlmBalance(parseFloat(xlm.balance).toFixed(2));
      await fetchTransactions(cleanKey);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch balance. Your account may not be funded on Stellar Testnet. Use Friendbot.");
    } finally {
      setLoadingBalance(false);
    }
  };

  const connectWallet = async () => {
    try {
      setError("");
      setTxStatus("");
      setTxHash("");

      // Check if Freighter is installed before attempting connection
      let freighterConnected = false;
      try {
        const connectionStatus = await isConnected();
        freighterConnected = connectionStatus?.isConnected === true;
      } catch {
        freighterConnected = false;
      }

      if (!freighterConnected) {
        setError("❌ Error: Freighter wallet not found. Please install the Freighter browser extension and try again.");
        return;
      }

      await setAllowed();
      const result = await getAddress();
      if (!result || !result.address) {
        setError("🚫 Error: You rejected the connection request. Please approve it in Freighter to continue.");
        return;
      }
      const cleanAddress = result.address.trim();
      setWalletAddress(cleanAddress);
      await fetchBalance(cleanAddress);
    } catch (err) {
      console.error(err);
      setError(classifyError(err, "connect"));
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setXlmBalance(null);
    setGoalName("My Savings Goal");
    setGoalAmount(100);
    setSavedAmount(0);
    setReceiverAddress("");
    setSendAmount("");
    setTxStatus("");
    setTxHash("");
    setError("");
    setTransactions([]);
  };

  const sendXLM = async () => {
    try {
      setError("");
      setTxStatus("");
      setTxHash("");
      if (!walletAddress) { setError("Please connect your wallet first."); return; }
      if (!receiverAddress.trim()) { setError("Please enter a Savings Wallet Address."); return; }
      if (!sendAmount || isNaN(sendAmount) || parseFloat(sendAmount) <= 0) { setError("Enter a valid amount greater than 0."); return; }

      const destination = receiverAddress.trim();
      const amountToSend = parseFloat(sendAmount).toFixed(2);

      // ── Status: Pending ──
      setTxStatus("pending");
      const account = await server.loadAccount(walletAddress);
      const fee = await server.fetchBaseFee();
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.payment({ destination, asset: StellarSdk.Asset.native(), amount: amountToSend }))
        .setTimeout(60).build();

      setTxStatus("signing");
      const signedResponse = await signTransaction(transaction.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
      const signedXdr = signedResponse.signedTxXdr;
      if (!signedXdr) {
        setError("🚫 Error: Freighter did not return a signed transaction. You may have rejected it.");
        setTxStatus("failed");
        return;
      }

      setTxStatus("submitting");
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
      const result = await server.submitTransaction(signedTx);

      setTxStatus("success");
      setTxHash(result.hash);
      setSavedAmount((prev) => prev + parseFloat(amountToSend));
      await fetchBalance(walletAddress);
      setSendAmount("");
    } catch (err) {
      console.error(err);
      setError(classifyError(err, "send"));
      setTxStatus("failed");
    }
  };

  const progressPercent = Math.min((savedAmount / goalAmount) * 100, 100);

  return (
    <div className="app">
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {walletAddress && <NavBar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              !walletAddress ? (
                <IntroPage connectWallet={connectWallet} error={error} />
              ) : (
                <Navigate to="/wallet" />
              )
            }
          />

          <Route
            path="/wallet"
            element={
              walletAddress ? (
                <WalletPage
                  walletAddress={walletAddress}
                  xlmBalance={xlmBalance}
                  loadingBalance={loadingBalance}
                  disconnectWallet={disconnectWallet}
                  goalName={goalName}
                  setGoalName={setGoalName}
                  goalAmount={goalAmount}
                  setGoalAmount={setGoalAmount}
                  savedAmount={savedAmount}
                  progressPercent={progressPercent}
                  savedAddresses={savedAddresses}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/send"
            element={
              walletAddress ? (
                <SendPage
                  receiverAddress={receiverAddress}
                  setReceiverAddress={setReceiverAddress}
                  sendAmount={sendAmount}
                  setSendAmount={setSendAmount}
                  sendXLM={sendXLM}
                  txStatus={txStatus}
                  txHash={txHash}
                  savedAddresses={savedAddresses}
                  showAddressModal={showAddressModal}
                  setShowAddressModal={setShowAddressModal}
                  newContactName={newContactName}
                  setNewContactName={setNewContactName}
                  saveAddress={saveAddress}
                  error={error}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/history"
            element={
              walletAddress ? (
                <HistoryPage transactions={transactions} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/onchain"
            element={
              walletAddress ? (
                <OnChainSavings walletAddress={walletAddress} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
