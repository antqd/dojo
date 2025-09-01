// src/pages/ContactDojo.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const API_CLIENTE = "https://emailsender-68kp.onrender.com/api/sendToClient";

export default function ContactDojo() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefono: "",
    messaggio: "",
  });
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toBase64 = (f) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setDone(false);
    setError("");

    try {
      if (!form.nome || !form.email) {
        throw new Error("Inserisci almeno nome ed email.");
      }

      let allegati = [];
      if (file) {
        allegati = [
          {
            filename: file.name || "allegato.pdf",
            base64: await toBase64(file),
          },
        ];
      }

      const res = await fetch(API_CLIENTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email, // il cliente riceve la conferma qui
          telefono: form.telefono,
          messaggio: form.messaggio,
          allegati,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Errore ${res.status}`);
      }

      setDone(true);
      setForm({ nome: "", email: "", telefono: "", messaggio: "" });
      setFile(null);
    } catch (err) {
      setError(err.message || "Errore durante l'invio.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F6] text-[#0B2B23]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="DOJO" className="h-7" />
            <span className="sr-only">Dojo</span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-[#1BA97F] text-[#1BA97F] px-4 py-2 text-sm font-medium hover:bg-[#1BA97F]/5"
          >
            Torna alla Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#1BA97F]/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1BA97F] mb-3">
              Contattaci
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Parla con un{" "}
              <span className="text-[#1BA97F]">Partner Manager</span>
            </h1>
            <p className="mt-3 text-[#2B4A42] max-w-xl">
              Lascia i tuoi dati e, se vuoi, allega un documento. Riceverai una
              conferma via email. Ti ricontatteremo presto.
            </p>
          </div>
          <div className="hidden lg:block">
            <img
              src="/images/dojo.png"
              alt="Dojo POS"
              className="w-full max-w-md ml-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Form */}
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-black/5"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nome e Cognome *</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Mario Rossi"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="mario@email.it"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Telefono</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="+39 ..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Messaggio</label>
              <textarea
                name="messaggio"
                value={form.messaggio}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Raccontaci in breve cosa ti serve…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Allegato (opzionale)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0 file:text-sm file:font-semibold
                           file:bg-[#eaf8f2] file:text-[#0B2B23] hover:file:bg-[#d7f1e6]"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {file && (
                <p className="text-xs text-[#2B4A42] mt-1">
                  {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {done && (
            <div className="mt-4 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
              Messaggio inviato! Ti abbiamo mandato una conferma via email.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-[#1BA97F] px-5 py-3 text-white font-medium shadow hover:brightness-110 disabled:opacity-60"
            >
              {sending ? "Invio..." : "Invia richiesta"}
            </button>
            <Link
              to="/"
              className="rounded-full px-5 py-3 border border-[#1BA97F] text-[#1BA97F] font-medium hover:bg-[#1BA97F]/5"
            >
              Torna alla Home
            </Link>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 text-sm text-[#2B4A42]">
          © {new Date().getFullYear()} Dojo — Tutti i diritti riservati
        </div>
      </footer>
    </div>
  );
}
