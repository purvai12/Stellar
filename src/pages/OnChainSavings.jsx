import React, { useEffect, useState, useCallback } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import PageTransition from "../components/PageTransition";

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CB2QEUXSE7JNVZQIFQLTWWMTNYZFMYBUEJTHBNPBJRYU2OGRCS66K65P";
const sorobanServer = new StellarSdk.rpc.Server(RPC_URL);

export default function OnChainSavings({ walletAddress }) {
  const [events, setEvents] = useState([]);
  const [globalSaved, setGlobalSaved] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const tx = new StellarSdk.TransactionBuilder(await sorobanServer.getAccount(walletAddress), { fee: "100", networkPassphrase: StellarSdk.Networks.TESTNET })
        .addOperation(contract.call("get_saved", new StellarSdk.Address(walletAddress).toScVal()))
        .setTimeout(60).build();
      const sim = await sorobanServer.simulateTransaction(tx);
      const val = sim.result?.retval;
      if (val) {
        setGlobalSaved(StellarSdk.scValToNative(val).toString());
      } else {
        setGlobalSaved("0");
      }
    } catch {
      setGlobalSaved("0");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const [startLedger, setStartLedger] = useState(null);

  const initLedger = useCallback(async () => {
    try {
      const latest = await sorobanServer.getLatestLedger();
      setStartLedger(Math.max(1, latest.sequence - 5000)); // ~7 hours ago roughly
    } catch {
      setStartLedger(1);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!startLedger) return;
    try {
      const res = await sorobanServer.getEvents({
        startLedger: startLedger,
        filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
        limit: 15,
      });
      setEvents(res.events.reverse());
    } catch (err) {
      console.error(err);
    }
  }, [startLedger]);

  useEffect(() => {
    initLedger();
  }, [initLedger]);

  useEffect(() => {
    fetchData();
    if (startLedger) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchData, fetchEvents, startLedger]);

  return (
    <PageTransition>
      <div className="page-header">
        <h1 className="page-title">On-Chain Interaction Diagnostics</h1>
        <p className="page-subtitle">Raw view of your Soroban contract data and live events.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 className="section-title">Your On-Chain Data</h2>
          <div className="card-value">{loading ? '...' : globalSaved} XLM</div>
          <p className="card-sub" style={{ marginBottom: 16 }}>Total directly mapped to your wallet in the contract.</p>
          <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>↻ Refresh Memory</button>

          <hr className="divider" />
          <h2 className="section-title">Deployed Contract (Testnet)</h2>
          <div className="mono" style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, fontSize: '0.8rem', marginBottom: 12 }}>
            {CONTRACT_ID}
          </div>
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer" className="tx-link">
            🔗 View Contract on Stellar Expert ↗
          </a>
        </div>

        <div className="card">
          <h2 className="section-title">📡 Live Contract Events (Global)</h2>
          {events.length === 0 ? (
            <p className="form-label" style={{ fontStyle: 'italic' }}>Listening for contract invocations...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 350, overflowY: 'auto' }}>
              {events.map((ev, i) => (
                <div key={i} style={{ padding: 10, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="chip chip-purple">{ev.type}</span>
                    <span className="mono" style={{ fontSize: '0.72rem' }}>Ledger {ev.ledger}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.65rem' }}>
                    {ev.id}
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
