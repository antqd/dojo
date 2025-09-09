// src/pages/OnboardingAzienda.jsx
import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_URL =
  "https://emailsender-68kp.onrender.com/api/diventa-partner-manager";

export default function OnboardingAzienda() {
  const [form, setForm] = useState({
    ragioneSociale: "",
    indirizzo: "",
    comune: "",
    cap: "",
    descrizione: "",
    telefono: "",
    email: "",
    iban: "",
  });

  // Allegati (ora multipli)
  const [visura, setVisura] = useState([]); // File[]
  const [docId, setDocId] = useState([]); // File[]
  const [codFiscale, setCodFiscale] = useState([]); // File[]

  // Previews multipli
  const [visuraPreview, setVisuraPreview] = useState([]); // {url,isImage,isPdf,name,size}[]
  const [docIdPreview, setDocIdPreview] = useState([]);
  const [codFiscalePreview, setCodFiscalePreview] = useState([]);

  // Firma su canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // --- Utility
  const toBase64 = (f) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const mkPreviews = (files) =>
    (files || []).map((file) => {
      const url = URL.createObjectURL(file);
      const isImage = /^image\//.test(file.type);
      const isPdf = file.type === "application/pdf";
      return { url, isImage, isPdf, name: file.name, size: file.size };
    });

  useEffect(() => {
    setVisuraPreview(mkPreviews(visura));
    return () => visuraPreview.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visura]);

  useEffect(() => {
    setDocIdPreview(mkPreviews(docId));
    return () => docIdPreview.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    setCodFiscalePreview(mkPreviews(codFiscale));
    return () => codFiscalePreview.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codFiscale]);

  // --- Firma: disegno mouse/touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // sfondo bianco per export
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0B2B23";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    setIsDrawing(true);
    setHasSignature(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // reimposta sfondo bianco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const exportSignatureBase64 = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL("image/png");
    return dataURL.split(",")[1]; // base64 puro
  };

  const validate = () => {
    if (!form.ragioneSociale.trim()) return "Inserisci la ragione sociale.";
    if (!form.indirizzo.trim()) return "Inserisci l'indirizzo.";
    if (!form.comune.trim()) return "Inserisci il comune di residenza.";
    if (!form.cap.trim() || !/^\d{5}$/.test(form.cap))
      return "Inserisci un CAP valido (5 cifre).";
    if (!form.email.trim() || !form.email.includes("@"))
      return "Inserisci una email valida.";
    if (!form.iban.trim()) return "Inserisci l'IBAN.";
    if (!visura.length || !docId.length || !codFiscale.length)
      return "Allega tutti i documenti richiesti.";
    if (!hasSignature) return "Fornisci la firma.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setDone(false);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSending(true);
    try {
      const toPayloadFiles = async (arr) =>
        Promise.all(
          arr.map(async (f) => ({
            filename: f.name,
            base64: await toBase64(f),
            mime: f.type,
          }))
        );

      const allegati = {
        visura: await toPayloadFiles(visura), // array
        documento_identita: await toPayloadFiles(docId), // array
        codice_fiscale: await toPayloadFiles(codFiscale), // array
        firma: {
          filename: "firma.png",
          base64: exportSignatureBase64(),
          mime: "image/png",
        }, // singola
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, allegati }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Errore ${res.status}`);
      }

      setDone(true);
      // reset form
      setForm({
        ragioneSociale: "",
        indirizzo: "",
        comune: "",
        cap: "",
        descrizione: "",
        telefono: "",
        email: "",
        iban: "",
      });
      setVisura([]);
      setDocId([]);
      setCodFiscale([]);
      setVisuraPreview([]);
      setDocIdPreview([]);
      setCodFiscalePreview([]);
      clearSignature();
    } catch (err) {
      setError(err.message || "Errore durante l'invio.");
    } finally {
      setSending(false);
    }
  };

  const UploadBox = ({
    label,
    files, // File[]
    setFiles, // (File[]) => void
    previews, // {url,isImage,isPdf,name,size}[]
    accept = ".pdf,.jpg,.jpeg,.png",
  }) => {
    const onPick = (e) => {
      const picked = Array.from(e.target.files || []);
      if (!picked.length) return;
      setFiles((prev) => [...prev, ...picked]); // append senza limiti
    };
    const removeAt = (idx) =>
      setFiles((prev) => prev.filter((_, i) => i !== idx));

    return (
      <div className="rounded-xl border border-black/5 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{label}</div>
            <p className="text-xs text-[#2B4A42]/70">
              Formati: PDF, JPG, PNG • senza limiti di numero
            </p>
          </div>
          <label className="inline-flex cursor-pointer rounded-full border border-[#1BA97F] text-[#1BA97F] px-3 py-1.5 text-xs font-medium hover:bg-[#1BA97F]/5">
            Aggiungi
            <input
              type="file"
              className="hidden"
              multiple
              accept={accept}
              onChange={onPick}
            />
          </label>
        </div>

        {files.length ? (
          <ul className="mt-3 space-y-2">
            {previews.map((p, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[80px_1fr_auto] gap-3 items-center"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden ring-1 ring-black/5 bg-[#F6F7F6] flex items-center justify-center">
                  {p.isImage ? (
                    <img
                      src={p.url}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : p.isPdf ? (
                    <span className="text-[10px] text-[#0B2B23] px-2 text-center">
                      PDF
                    </span>
                  ) : (
                    <span className="text-xs text-[#0B2B23]">FILE</span>
                  )}
                </div>
                <div className="text-sm min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-[#2B4A42]/70">
                    {(p.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-black/10 p-3 text-xs text-[#2B4A42]/70">
            Nessun file selezionato
          </div>
        )}
      </div>
    );
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
              Onboarding Azienda
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Diventa <span className="text-[#1BA97F]">Partner Manager</span>
            </h1>
            <p className="mt-3 text-[#2B4A42] max-w-xl">
              Compila i dati anagrafici e carica i documenti richiesti. Firma
              direttamente qui sotto per completare la richiesta.
            </p>
          </div>
          <div className="hidden lg:block">
            <img
              src="/images/velocita.png"
              alt="Dojo POS"
              className="w-full max-w-md ml-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Form */}
      <main className="mx-auto max-w-4xl px-4 pb-16">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-black/5"
        >
          {/* Dati anagrafici */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Ragione sociale *</label>
              <input
                name="ragioneSociale"
                value={form.ragioneSociale}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Rossi S.r.l."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Indirizzo *</label>
              <input
                name="indirizzo"
                value={form.indirizzo}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Via Roma 1"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Comune di residenza *
              </label>
              <input
                name="comune"
                value={form.comune}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Milano"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">CAP *</label>
              <input
                name="cap"
                value={form.cap}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="20100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">
                Descrivi in sintesi la tua attività
              </label>
              <textarea
                name="descrizione"
                value={form.descrizione}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="Breve descrizione…"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Telefono</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="+39 ..."
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
                placeholder="azienda@email.it"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">IBAN *</label>
              <input
                name="iban"
                value={form.iban}
                onChange={onChange}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1BA97F]"
                placeholder="IT60 X054 2811 1010 0000 0123 456"
              />
            </div>
          </div>

          {/* Allegati (multi-file) */}
          <div className="mt-8 grid lg:grid-cols-3 gap-4">
            <UploadBox
              label="Visura camerale *"
              files={visura}
              setFiles={setVisura}
              previews={visuraPreview}
            />
            <UploadBox
              label="Documento d'identità *"
              files={docId}
              setFiles={setDocId}
              previews={docIdPreview}
            />
            <UploadBox
              label="Codice fiscale *"
              files={codFiscale}
              setFiles={setCodFiscale}
              previews={codFiscalePreview}
            />
          </div>

          {/* Firma */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Firma *</div>
                <p className="text-xs text-[#2B4A42]/70">
                  Firma con mouse o dito (mobile). Puoi cancellare e rifare.
                </p>
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="rounded-full border border-[#1BA97F] text-[#1BA97F] px-3 py-1.5 text-xs font-medium hover:bg-[#1BA97F]/5"
              >
                Cancella firma
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
              <canvas
                ref={canvasRef}
                width={800}
                height={220}
                className="w-full h-[220px] rounded-lg bg-white touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {done && (
            <div className="mt-4 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
              Dati inviati correttamente! Ti contatteremo a breve.
            </div>
          )}

          {/* Actions */}
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
