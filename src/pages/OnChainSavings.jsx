import React, { useEffect, useState, useCallback } from "react";
import { signTransaction } from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import PageTransition from "../components/PageTransition";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const CONTRACT_ID = "CB2QEUXSE7JNVZQIFQLTWWMTNYZFMYBUEJTHBNPBJRYU2OGRCS66K65P";

const sorobanServer = new StellarSdk.rpc.Server(RPC_URL);

// ─── Reusable Status Banner ─────────────────────────────────────────────────
const TxStatusBanner = ({ status, txHash, error }) => {
  if (!status && !error) return null;

  const bannerStates = {
    building: { icon: "⏳", label: "Building transaction...", cls: "status-pending" },
    signing: { icon: "✍️", label: "Waiting for Freighter signature...", cls: "status-pending" },
    submitting: { icon: "📡", label: "Submitting to Soroban...", cls: "status-pending" },
    success: { icon: "✅", label: "Transaction Successful!", cls: "status-success" },
    failed: { icon: "❌", label: "Transaction Failed", cls: "status-failed" },
    loading: { icon: "📡", label: "Fetching on-chain data...", cls: "status-pending" },
  };

  const state = bannerStates[status] || { icon: "ℹ️", label: status, cls: "status-pending" };

  return (
    <div style={{ marginTop: "16px" }}>
      {status && (
        <div className={`txStatusBanner ${state.cls}`}>
          <span className="txStatusIcon">{state.icon}</span>
          <span className="txStatusLabel">{state.label}</span>
          {status === "success" && txHash && (
            <div className="txHashSection">
              <p className="txHashLabel">Transaction Hash:</p>
              <p className="hash">{txHash}</p>
              <a
                className="txHashLink"
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                🔗 View on Stellar Expert ↗
              </a>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="errorBox">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

// ─── Error Classification ────────────────────────────────────────────────────
const classifyContractError = (err) => {
  const msg = (err?.message || "").toLowerCase();

  // 1. Wallet not found
  if (msg.includes("not installed") || msg.includes("extension not found") || msg.includes("freighter") && msg.includes("not")) {
    return "❌ Error: Freighter wallet not found. Please install the extension.";
  }
  // 2. User rejected
  if (msg.includes("rejected") || msg.includes("declined") || msg.includes("denied") || msg.includes("cancelled")) {
    return "🚫 Error: You rejected the transaction. Please approve it in Freighter.";
  }
  // 3. Insufficient balance / underfunded
  if (msg.includes("underfunded") || msg.includes("insufficient") || msg.includes("not enough")) {
    return "💸 Error: Insufficient balance. Fund your account using Stellar Friendbot.";
  }

  return "⚠️ Contract call failed. Please check your wallet and try again.";
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function OnChainSavings({ walletAddress }) {
  const wallet = walletAddress;

  const [goal, setGoal] = useState("0");
  const [saved, setSaved] = useState("0");
  const [newGoal, setNewGoal] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);

  const isBusy = status === "building" || status === "signing" || status === "submitting";

  // ── Fetch on-chain savings data ─────────────────────────────────────────
  const fetchOnChainData = useCallback(async () => {
    if (!wallet) return;
    try {
      setError("");
      setStatus("loading");
      const contract = new StellarSdk.Contract(CONTRACT_ID);

      const goalTx = new StellarSdk.TransactionBuilder(
        await sorobanServer.getAccount(wallet),
        { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call("get_goal", new StellarSdk.Address(wallet)))
        .setTimeout(60)
        .build();
      const goalSim = await sorobanServer.simulateTransaction(goalTx);
      const goalValue = goalSim.result?.retval?.value()?.toString() || "0";

      const savedTx = new StellarSdk.TransactionBuilder(
        await sorobanServer.getAccount(wallet),
        { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call("get_saved", new StellarSdk.Address(wallet)))
        .setTimeout(60)
        .build();
      const savedSim = await sorobanServer.simulateTransaction(savedTx);
      const savedValue = savedSim.result?.retval?.value()?.toString() || "0";

      setGoal(goalValue);
      setSaved(savedValue);
      setStatus("");
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to fetch contract data. Try again.");
      setStatus("");
    }
  }, [wallet]);

  // ── Set Goal on-chain ───────────────────────────────────────────────────
  const setGoalOnChain = async () => {
    try {
      setError("");
      setStatus("");
      setTxHash("");
      if (!wallet) { setError("Wallet not connected."); return; }
      if (!newGoal || isNaN(newGoal) || Number(newGoal) <= 0) {
        setError("Enter a valid goal amount (must be > 0).");
        return;
      }

      setStatus("building");
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await sorobanServer.getAccount(wallet);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "set_goal",
            new StellarSdk.Address(wallet),
            StellarSdk.nativeToScVal(Number(newGoal), { type: "i128" })
          )
        )
        .setTimeout(60)
        .build();

      const sim = await sorobanServer.simulateTransaction(tx);
      const preparedTx = StellarSdk.assembleTransaction(tx, sim).build();

      setStatus("signing");
      const signed = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);

      setStatus("submitting");
      const sent = await sorobanServer.sendTransaction(signedTx);
      setTxHash(sent.hash);
      setStatus("success");
      setNewGoal("");
      await fetchOnChainData();
    } catch (err) {
      console.error(err);
      setError(classifyContractError(err));
      setStatus("failed");
    }
  };

  // ── Add Savings on-chain ────────────────────────────────────────────────
  const addSavingsOnChain = async () => {
    try {
      setError("");
      setStatus("");
      setTxHash("");
      if (!wallet) { setError("Wallet not connected."); return; }
      if (!addAmount || isNaN(addAmount) || Number(addAmount) <= 0) {
        setError("Enter a valid savings amount (must be > 0).");
        return;
      }

      setStatus("building");
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const account = await sorobanServer.getAccount(wallet);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "add_savings",
            new StellarSdk.Address(wallet),
            StellarSdk.nativeToScVal(Number(addAmount), { type: "i128" })
          )
        )
        .setTimeout(60)
        .build();

      const sim = await sorobanServer.simulateTransaction(tx);
      const preparedTx = StellarSdk.assembleTransaction(tx, sim).build();

      setStatus("signing");
      const signed = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);

      setStatus("submitting");
      const sent = await sorobanServer.sendTransaction(signedTx);
      setTxHash(sent.hash);
      setStatus("success");
      setAddAmount("");
      await fetchOnChainData();
    } catch (err) {
      console.error(err);
      setError(classifyContractError(err));
      setStatus("failed");
    }
  };

  // ── Fetch Contract Events ───────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const res = await sorobanServer.getEvents({
        startLedger: 0,
        filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
        limit: 10,
      });
      setEvents(res.events.reverse());
    } catch (err) {
      console.error("Event fetch error:", err);
    }
  }, []);

  useEffect(() => {
    if (wallet) fetchOnChainData();
  }, [wallet, fetchOnChainData]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const progressPercent =
    Number(goal) > 0 ? Math.min((Number(saved) / Number(goal)) * 100, 100) : 0;

  return (
    <PageTransition>
      <div className="container">
        <h1 className="title">⛓️ On-Chain Savings</h1>

        {/* Contract Info */}
        <div className="card">
          <h2>Deployed Contract</h2>
          <div className="info">
            <p><b>Contract ID:</b></p>
            <p className="address">{CONTRACT_ID}</p>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="txHashLink"
              style={{ marginTop: "8px", display: "inline-block" }}
            >
              🔗 View on Stellar Expert ↗
            </a>
          </div>
        </div>

        {/* On-chain Data */}
        <div className="card">
          <h2>On-Chain Savings Data</h2>
          <div className="balanceBox">
            <p><b>Goal:</b> {goal} units</p>
            <p><b>Saved:</b> {saved} units</p>
          </div>
          <div className="progressContainer">
            <div className="progressText">
              <p><b>Progress:</b></p>
              <p>{progressPercent.toFixed(2)}%</p>
            </div>
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          <button
            className="btn primary"
            onClick={fetchOnChainData}
            disabled={isBusy || status === "loading"}
            style={{ marginTop: "12px" }}
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Set Goal */}
        <div className="card">
          <h2>Set Savings Goal</h2>
          <div className="inputBox">
            <label>New Goal Amount</label>
            <input
              type="number"
              placeholder="Enter goal amount"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              disabled={isBusy}
            />
          </div>
          <button className="btn success" onClick={setGoalOnChain} disabled={isBusy}>
            {isBusy ? "Processing..." : "Set Goal On-Chain"}
          </button>
          <TxStatusBanner status={status} txHash={txHash} error={error} />
        </div>

        {/* Add Savings */}
        <div className="card">
          <h2>Add Savings</h2>
          <div className="inputBox">
            <label>Savings Amount</label>
            <input
              type="number"
              placeholder="Enter amount to add"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              disabled={isBusy}
            />
          </div>
          <button className="btn primary" onClick={addSavingsOnChain} disabled={isBusy}>
            {isBusy ? "Processing..." : "Add Savings On-Chain"}
          </button>
        </div>

        {/* Live Events */}
        <div className="card">
          <h2>📡 Live Contract Events</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--secondary-color)", marginBottom: "12px" }}>
            Auto-refreshes every 5 seconds
          </p>
          {events.length === 0 ? (
            <p style={{ color: "var(--secondary-color)", fontStyle: "italic" }}>
              No events emitted yet...
            </p>
          ) : (
            <div className="historyList">
              {events.map((ev, i) => (
                <div key={i} className="historyItem">
                  <div>
                    <p style={{ fontWeight: "bold" }}>
                      {ev.type === "contract" ? "📋 Contract" : "🔔"} Event
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--secondary-color)" }}>
                      Ledger #{ev.ledger} · {ev.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
