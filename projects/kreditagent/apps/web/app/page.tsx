"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Banknote, ShieldCheck, WalletCards } from "lucide-react";

type ScoreResponse = {
  score: number;
  band: string;
  evidenceHash: string;
  featureHash: string;
  positiveFactors: string[];
  riskFactors: string[];
  features: { avgDailyRevenueIdr: number; activeDays: number; channelCount: number; warnings: string[] };
  narrative: { borrowerSummary: string; lenderMemo: string; manualReviewQuestions: string[] };
};

type PublishResponse = {
  attestation: { attestationId: string; signature: string; validationStatus: string; score: number; band: string };
  txHash: string;
  explorerUrl: string;
};

type PaidAttestation = PublishResponse["attestation"] & { payment: { receiptHash: string; resource: string; network: string } };

type RepaymentResponse = { event: { eventType: string; scoreDelta: number; evidenceHash: string }; updatedScore: ScoreResponse };

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const borrowerId = "bor_bu_siti";

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

async function get<T>(path: string, paid = false): Promise<{ status: number; data: T | null; paymentRequired?: string | null }> {
  const res = await fetch(`${API}${path}`, paid ? { headers: { "PAYMENT-SIGNATURE": "demo-paid" } } : undefined);
  if (res.status === 402) return { status: 402, data: null, paymentRequired: res.headers.get("PAYMENT-REQUIRED") };
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return { status: res.status, data: await res.json(), paymentRequired: null };
}

function Hash({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-500">pending</span>;
  return <code className="break-all rounded-lg bg-slate-950 px-2 py-1 text-xs text-emerald-300">{value}</code>;
}

export default function Page() {
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [published, setPublished] = useState<PublishResponse | null>(null);
  const [paymentRequired, setPaymentRequired] = useState<string | null>(null);
  const [paid, setPaid] = useState<PaidAttestation | null>(null);
  const [repayment, setRepayment] = useState<RepaymentResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const currentScore = repayment?.updatedScore ?? score;

  const attestationId = published?.attestation.attestationId;
  const reset = async () => {
    setBusy("reset");
    await post("/v1/demo/reset");
    setScore(null); setPublished(null); setPaymentRequired(null); setPaid(null); setRepayment(null); setBusy(null);
  };

  const steps = useMemo(() => [
    { title: "1. Score borrower", done: Boolean(score) },
    { title: "2. Publish ERC-8004-style attestation", done: Boolean(published) },
    { title: "3. Trigger x402 402 response", done: Boolean(paymentRequired) },
    { title: "4. Pay and receive attestation", done: Boolean(paid) },
    { title: "5. Simulate repayment reputation", done: Boolean(repayment) }
  ], [score, published, paymentRequired, paid, repayment]);

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="card p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex gap-2">
                <span className="badge">ERC-8004-style registries</span>
                <span className="badge">x402-compatible 402 flow</span>
                <span className="badge">No lender custody</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">KreditAgent</h1>
              <p className="mt-3 max-w-3xl text-slate-300">Portable credit reputation for Indonesian MSMEs. Deterministic scoring, signed attestations, validation, and paid lender access in one demo loop.</p>
            </div>
            <button className="btn-secondary" disabled={busy === "reset"} onClick={reset}>Reset demo</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {steps.map((s) => (
            <div key={s.title} className="card p-4">
              <div className="flex items-center gap-2 text-sm"><BadgeCheck className={s.done ? "text-emerald-300" : "text-slate-600"} size={18} />{s.title}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3"><WalletCards className="text-emerald-300" /><h2 className="text-2xl font-semibold">Borrower view: Bu Siti Warung</h2></div>
            <p className="mb-4 text-sm text-slate-400">Synthetic QRIS + Tokopedia fixture with one adversarial row to prove sanitization.</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={busy !== null} onClick={async () => { setBusy("score"); setScore(await post(`/v1/borrowers/${borrowerId}/score`)); setBusy(null); }}>Run borrower scoring</button>
              <button className="btn-secondary" disabled={!score || busy !== null} onClick={async () => { setBusy("publish"); setPublished(await post(`/v1/borrowers/${borrowerId}/publish-attestation`)); setBusy(null); }}>Publish attestation</button>
              <button className="btn-secondary" disabled={!paid || busy !== null} onClick={async () => { setBusy("repay"); setRepayment(await post(`/v1/borrowers/${borrowerId}/simulate-repayment`)); setBusy(null); }}>Simulate repayment</button>
            </div>

            {currentScore && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-950 p-4"><div className="text-sm text-slate-400">Score</div><div className="text-4xl font-bold text-emerald-300">{currentScore.score}</div></div>
                  <div className="rounded-2xl bg-slate-950 p-4"><div className="text-sm text-slate-400">Band</div><div className="text-4xl font-bold">{currentScore.band}</div></div>
                  <div className="rounded-2xl bg-slate-950 p-4"><div className="text-sm text-slate-400">Active days</div><div className="text-4xl font-bold">{currentScore.features.activeDays}</div></div>
                </div>
                <div><h3 className="font-semibold">Borrower explanation</h3><p className="mt-1 text-sm text-slate-300">{currentScore.narrative.borrowerSummary}</p></div>
                <div><h3 className="font-semibold">Evidence hash</h3><Hash value={currentScore.evidenceHash} /></div>
                <div><h3 className="font-semibold">Feature hash</h3><Hash value={currentScore.featureHash} /></div>
                {currentScore.features.warnings.length > 0 && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">Sanitizer warning: {currentScore.features.warnings[0]}</div>}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3"><Banknote className="text-emerald-300" /><h2 className="text-2xl font-semibold">Lender view: paid attestation</h2></div>
            <p className="mb-4 text-sm text-slate-400">The first request returns HTTP 402. The second request sends a demo payment signature and receives the signed credit package.</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={!attestationId || busy !== null} onClick={async () => { setBusy("request402"); const res = await get(`/v1/attestations/${attestationId}/audit`); setPaymentRequired(res.paymentRequired ?? "402 returned"); setBusy(null); }}>Request audit attestation</button>
              <button className="btn-secondary" disabled={!attestationId || !paymentRequired || busy !== null} onClick={async () => { setBusy("pay"); const res = await get<PaidAttestation>(`/v1/attestations/${attestationId}/audit`, true); setPaid(res.data); setBusy(null); }}>Pay with LenderAgent</button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-950 p-4">
                <h3 className="font-semibold">Published attestation</h3>
                <p className="mt-2 text-sm text-slate-400">ID: {attestationId ?? "pending"}</p>
                <p className="mt-2 text-sm text-slate-400">Mock tx: <Hash value={published?.txHash} /></p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <h3 className="font-semibold">x402 payment required</h3>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{paymentRequired ?? "pending"}</pre>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4">
                <h3 className="font-semibold">Paid response</h3>
                {paid ? <div className="space-y-2 text-sm"><p>Score: <b>{paid.score}</b> / Band <b>{paid.band}</b></p><p>Validation: {paid.validationStatus}</p><p>Receipt: <Hash value={paid.payment.receiptHash} /></p><p>Signature: <Hash value={paid.signature} /></p></div> : <p className="text-sm text-slate-500">pending</p>}
              </div>
              {repayment && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><ShieldCheck className="mb-2 text-emerald-300" />Reputation updated: {repayment.event.eventType} (+{repayment.event.scoreDelta})</div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
