// MandatoForm.jsx
import React, { useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

/**
 * NOTE:
 * - pdf-lib: origine coordinate in basso a sinistra.
 * - Pagine richieste: 2 e 5 => index 1 e 4.
 * - Ora stampiamo SOLO FIRME (Expo energia + Procacciatore) e le stampiamo 2 volte su pagina 5.
 * - INVIO BACKOFFICE: POST /api/email/mandato-energy-planner
 *   body: { nome?, ragioneSociale?, email?, telefono?, messaggio?, attachments? }
 */

export default function MandatoForm() {
  const [formData, setFormData] = useState({
    // PAGINA 2
    ragioneSociale: "",
    rappresentanteLegale: "",
    dataNascita: "",
    luogoNascita: "",
    indirizzoSede: "",
    cap: "",
    comune: "",
    provincia: "",
    numeroDocumento: "",
    dataRilascio: "",
    enteRilascio: "",
    codiceFiscale: "",
    partitaIva: "",
    iscrittoCCIA: "",
    rea: "",
    telefono: "",
    fax: "",
    cellulare: "",
    email: "",
    pec: "",

    // INVIO (opzionale)
    messaggio: "",
  });

  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ===== INVIO BACKOFFICE =====
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isStartingYousign, setIsStartingYousign] = useState(false);
  const [yousignStatus, setYousignStatus] = useState(null);
  const [yousignSignatureRequestId, setYousignSignatureRequestId] =
    useState(null);
  const [isSendingSignedDocument, setIsSendingSignedDocument] = useState(false);
  const [signedDocumentStatus, setSignedDocumentStatus] = useState(null);

  // ===== FIRME: Expo energia + Procacciatore =====
  const [isSigExpoActive, setIsSigExpoActive] = useState(false);
  const [isSigProcActive, setIsSigProcActive] = useState(false);

  const sigExpoRef = useRef(null);
  const sigProcRef = useRef(null);

  const API_YOUSIGN =
    import.meta.env.VITE_YOUSIGN_API_URL ||
    "https://api.davveroo.it/api/yousign-signature-request";
  const API_YOUSIGN_SEND_SIGNED_DOCUMENT =
    import.meta.env.VITE_YOUSIGN_SEND_SIGNED_DOCUMENT_URL ||
    "https://api.davveroo.it/api/yousign-send-signed-document";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const toggleExpo = () => setIsSigExpoActive((s) => !s);
  const toggleProc = () => setIsSigProcActive((s) => !s);

  const clearExpo = () => sigExpoRef.current?.clear();
  const clearProc = () => sigProcRef.current?.clear();

  const getSigDataUrl = (ref) => {
    if (!ref?.current || ref.current.isEmpty()) return null;
    return ref.current.getTrimmedCanvas().toDataURL("image/png");
  };

  const normalizePhoneForOtp = (phone) => {
    const compact = String(phone || "").replace(/[\s().-]/g, "");
    if (!compact) return "";
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("00")) return `+${compact.slice(2)}`;
    if (/^3\d{8,10}$/.test(compact)) return `+39${compact}`;
    return compact;
  };

  const isValidOtpPhone = (phone) => /^\+[1-9]\d{7,14}$/.test(phone);

  // ====== COORDINATE CAMPI ======
  const FIELDS = useMemo(
    () => ({
      // ---- PAGINA 2 (index 1) ----
      page2: {
        ragioneSociale: { x: 55, y: 650, size: 11 },
        rappresentanteLegale: { x: 315, y: 650, size: 11 },

        dataNascita: { x: 55, y: 610, size: 11 },
        luogoNascita: { x: 190, y: 610, size: 11 },
        indirizzoSede: { x: 340, y: 610, size: 11 },

        cap: { x: 55, y: 570, size: 11 },
        comune: { x: 150, y: 570, size: 11 },
        provincia: { x: 290, y: 570, size: 11 },
        numeroDocumento: { x: 390, y: 570, size: 11 },

        dataRilascio: { x: 55, y: 525, size: 11 },
        enteRilascio: { x: 190, y: 525, size: 11 },
        codiceFiscale: { x: 370, y: 525, size: 11 },

        partitaIva: { x: 55, y: 485, size: 11 },
        iscrittoCCIA: { x: 315, y: 485, size: 11 },
        rea: { x: 470, y: 485, size: 11 },

        telefono: { x: 55, y: 445, size: 11 },
        fax: { x: 235, y: 445, size: 11 },
        cellulare: { x: 400, y: 445, size: 11 },

        email: { x: 55, y: 405, size: 11 },
        pec: { x: 315, y: 405, size: 11 },
      },

      // ---- PAGINA 5 (index 4) ----
      // Qui mettiamo le firme 2 volte (sopra e sotto), Expo a sinistra e Procacciatore a destra.
      page5: {
        // BLOCCO 1 (quello sopra)
        blocco1: {
          expo: { x: 60, y: 390, w: 190, h: 35 },
          proc: { x: 345, y: 390, w: 190, h: 35 },
        },
        // BLOCCO 2 (quello sotto)
        blocco2: {
          expo: { x: 60, y: 140, w: 190, h: 35 },
          proc: { x: 345, y: 140, w: 190, h: 35 },
        },
      },
    }),
    [],
  );

  const drawSafeText = (page, font, text, x, y, size = 11) => {
    page.drawText((text ?? "").toString(), {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const generaPdfPreview = async () => {
    setIsGenerating(true);
    try {
      const existingPdfBytes = await fetch("/mandatoenergyplanner.pdf").then(
        (r) => r.arrayBuffer(),
      );

      if (existingPdfBytes.byteLength < 100) {
        throw new Error(
          "Template mandatoenergyplanner.pdf non disponibile. Copia il PDF originale in public/mandatoenergyplanner.pdf.",
        );
      }

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pages = pdfDoc.getPages();
      const page2 = pages[1];
      const page5 = pages[4];

      if (!page2 || !page5) {
        throw new Error(
          "Non trovo pagina 2 o 5 nel PDF. Controlla che il PDF abbia almeno 5 pagine.",
        );
      }

      // ===== PAG 2: campi anagrafici =====
      Object.entries(FIELDS.page2).forEach(([key, cfg]) => {
        drawSafeText(page2, font, formData[key], cfg.x, cfg.y, cfg.size);
      });

      // ===== PAG 5: firme (2 volte) =====
      const expoDataUrl = getSigDataUrl(sigExpoRef);
      const procDataUrl = getSigDataUrl(sigProcRef);

      const embedIfExists = async (dataUrl) => {
        if (!dataUrl) return null;
        const bytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
        return pdfDoc.embedPng(bytes);
      };

      const expoPng = await embedIfExists(expoDataUrl);
      const procPng = await embedIfExists(procDataUrl);

      const drawSig = (img, rect) => {
        if (!img) return;
        page5.drawImage(img, {
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
        });
      };

      // BLOCCO 1
      drawSig(expoPng, FIELDS.page5.blocco1.expo);
      drawSig(procPng, FIELDS.page5.blocco1.proc);

      // BLOCCO 2
      drawSig(expoPng, FIELDS.page5.blocco2.expo);
      drawSig(procPng, FIELDS.page5.blocco2.proc);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Errore durante la generazione del PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const scaricaPdf = () => {
    if (!pdfUrl) return;
    saveAs(pdfUrl, "mandatoenergyplanner_compilato.pdf");
  };

  // =========================
  // INVIO BACKOFFICE (EMAIL)
  // =========================
  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!(file instanceof File) && !(file instanceof Blob)) {
        return reject(new Error("Parametro non valido"));
      }
      const r = new FileReader();
      r.onload = () => {
        const res = r.result;
        if (!res) return reject(new Error("Risultato vuoto"));
        resolve(String(res).split(",")[1]); // solo base64 payload
      };
      r.onerror = (e) => reject(e);
      r.readAsDataURL(file);
    });

  const handleSubmitToBackoffice = async () => {
    // endpoint richiede email (clientEmail)
    const clientEmail = (formData.email || "").trim();
    if (!clientEmail)
      return alert("Inserisci l'email (obbligatoria) prima di inviare.");
    if (!pdfUrl) return alert("Genera prima il PDF.");

    setSubmitStatus(null);
    setIsSubmitting(true);

    try {
      // PDF generato come File
      const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
      const pdfFile = new File(
        [pdfBlob],
        "mandatoenergyplanner_compilato.pdf",
        {
          type: "application/pdf",
        },
      );

      // encoded attachments (solo il PDF)
      const base64Content = await convertFileToBase64(pdfFile);
      const encodedAttachments = [
        {
          filename: pdfFile.name,
          content: base64Content,
          contentType: pdfFile.type || "application/pdf",
          encoding: "base64",
          disposition: "attachment",
        },
      ];

      const res = await fetch("https://api.davveroo.it/api/email/mandato-energy-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:
            formData.rappresentanteLegale ||
            formData.ragioneSociale ||
            "Cliente",
          ragioneSociale: formData.ragioneSociale || "",
          email: clientEmail,
          telefono: formData.telefono || formData.cellulare || "",
          messaggio: (formData.messaggio || "").trim(),
          attachments: encodedAttachments,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Errore invio: ${res.status} - ${errorText}`);
      }

      setSubmitStatus("success");
      alert("Inviato al backoffice ✅");
    } catch (err) {
      console.error("Errore invio backoffice:", err);
      setSubmitStatus("error");
      alert(`Errore durante l'invio: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartYousignSignature = async () => {
    if (!pdfUrl) return alert("Genera prima il PDF.");

    const signerName =
      formData.rappresentanteLegale?.trim() ||
      formData.ragioneSociale?.trim();
    const signerEmail = formData.email?.trim();
    const signerPhoneNumber = normalizePhoneForOtp(
      formData.cellulare || formData.telefono,
    );

    if (!signerName) {
      alert("Inserisci il rappresentante legale o la ragione sociale.");
      return;
    }

    if (!signerEmail) {
      alert("Inserisci l'email del firmatario.");
      return;
    }

    if (!isValidOtpPhone(signerPhoneNumber)) {
      alert(
        "Inserisci il cellulare del firmatario in formato internazionale, ad esempio +393272485716.",
      );
      return;
    }

    setYousignStatus(null);
    setYousignSignatureRequestId(null);
    setSignedDocumentStatus(null);
    setIsStartingYousign(true);

    try {
      const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
      const pdfFile = new File(
        [pdfBlob],
        "mandatoenergyplanner_compilato.pdf",
        { type: "application/pdf" },
      );

      const payload = {
        document: {
          filename: pdfFile.name,
          mimeType: pdfFile.type,
          base64: await convertFileToBase64(pdfFile),
        },
        signer: {
          fullName: signerName,
          email: signerEmail,
          phoneNumber: signerPhoneNumber,
          locale: "it",
          signatureAuthenticationMode: "otp_sms",
        },
        signatureRequest: {
          name: `Mandato Energy Planner - ${
            formData.ragioneSociale?.trim() || signerName
          }`,
          externalId: formData.partitaIva?.trim() || undefined,
          deliveryMode: "email",
          template: "mandato-energy-planner",
          signatureFields: [
            { page: 5, x: 60, y: 390, width: 190, height: 35 },
            { page: 5, x: 345, y: 390, width: 190, height: 35 },
            { page: 5, x: 60, y: 140, width: 190, height: 35 },
            { page: 5, x: 345, y: 140, width: 190, height: 35 },
          ],
        },
        metadata: {
          template: "mandato-energy-planner",
          ragioneSociale: formData.ragioneSociale?.trim() || "",
          partitaIva: formData.partitaIva?.trim() || "",
          codiceFiscale: formData.codiceFiscale?.trim() || "",
        },
      };

      const res = await fetch(API_YOUSIGN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const details = data?.step ? ` (${data.step})` : "";
        throw new Error(
          data?.error ? `${data.error}${details}` : `HTTP ${res.status}`,
        );
      }

      setYousignSignatureRequestId(
        data?.signatureRequestId ||
          data?.signature_request_id ||
          data?.id ||
          null
      );
      setYousignStatus("success");
      alert("Richiesta di firma digitale Yousign avviata.");
    } catch (err) {
      console.error("Errore Yousign:", err);
      setYousignStatus("error");
      alert(`Errore Yousign: ${err.message}`);
    } finally {
      setIsStartingYousign(false);
    }
  };

  const handleSendSignedDocument = async () => {
    if (!yousignSignatureRequestId) {
      alert("Avvia prima una richiesta Yousign.");
      return;
    }

    setSignedDocumentStatus(null);
    setIsSendingSignedDocument(true);

    try {
      const res = await fetch(API_YOUSIGN_SEND_SIGNED_DOCUMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureRequestId: yousignSignatureRequestId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            `Documento non ancora completato su Yousign${
              data?.status ? `: ${data.status}` : ""
            }.`
          );
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setSignedDocumentStatus("success");
      alert("Documento firmato inviato a contratti@davveroo.it.");
    } catch (err) {
      console.error("Errore invio documento firmato:", err);
      setSignedDocumentStatus("error");
      alert(`Errore invio documento firmato: ${err.message}`);
    } finally {
      setIsSendingSignedDocument(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-black text-center">
          Compilazione Mandato Energy Planner
        </h2>

        {/* DATI PAGINA 2 */}
        <h3 className="text-lg sm:text-xl font-semibold text-orange-400">
          Dati Procacciatore (pagina 2)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            name="ragioneSociale"
            placeholder="Cognome e Nome / Ragione Sociale"
            value={formData.ragioneSociale}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="rappresentanteLegale"
            placeholder="Cognome e Nome Rappresentante Legale"
            value={formData.rappresentanteLegale}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="dataNascita"
            placeholder="Data di nascita"
            value={formData.dataNascita}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="luogoNascita"
            placeholder="Luogo di nascita"
            value={formData.luogoNascita}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="indirizzoSede"
            placeholder="Indirizzo Residenza o Sede Legale"
            value={formData.indirizzoSede}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg sm:col-span-2"
          />

          <input
            name="cap"
            placeholder="CAP"
            value={formData.cap}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="comune"
            placeholder="Comune"
            value={formData.comune}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="provincia"
            placeholder="Provincia (es. CS)"
            value={formData.provincia}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="numeroDocumento"
            placeholder="N° documento di riconoscimento"
            value={formData.numeroDocumento}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="dataRilascio"
            placeholder="Data di rilascio"
            value={formData.dataRilascio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="enteRilascio"
            placeholder="Ente di rilascio"
            value={formData.enteRilascio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="codiceFiscale"
            placeholder="Codice Fiscale"
            value={formData.codiceFiscale}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg sm:col-span-2"
          />

          <input
            name="partitaIva"
            placeholder="Partita IVA"
            value={formData.partitaIva}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="iscrittoCCIA"
            placeholder="Iscritto CCIA di"
            value={formData.iscrittoCCIA}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="rea"
            placeholder="N° REA"
            value={formData.rea}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg sm:col-span-2"
          />

          <input
            name="telefono"
            placeholder="Telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="fax"
            placeholder="FAX"
            value={formData.fax}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="cellulare"
            placeholder="Cellulare"
            value={formData.cellulare}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            name="email"
            placeholder="E-mail (obbligatoria per invio backoffice)"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            name="pec"
            placeholder="PEC"
            value={formData.pec}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg sm:col-span-2"
          />
        </div>

        {/* MESSAGGIO (OPZIONALE) */}
        <div className="mt-2">
          <h3 className="text-lg sm:text-xl font-semibold text-orange-400">
            Messaggio (opzionale per backoffice)
          </h3>
          <textarea
            name="messaggio"
            placeholder="Scrivi eventuali note per il backoffice..."
            value={formData.messaggio}
            onChange={handleChange}
            rows={4}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* FIRME */}
        <h3 className="text-lg sm:text-xl font-semibold text-orange-400">
          Firme (pagina 5) — Expo energia + Procacciatore (stampate 2 volte)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* FIRMA EXPO */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-blue-900 font-semibold text-sm sm:text-base">
                Firma Expo energia
              </p>
              <button
                onClick={toggleExpo}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isSigExpoActive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
                type="button"
              >
                {isSigExpoActive ? "🔓 Disattiva" : "🔒 Attiva"}
              </button>
            </div>

            {isSigExpoActive ? (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigExpoRef}
                  penColor="black"
                  canvasProps={{
                    width: 800,
                    height: 120,
                    className: "rounded-md",
                  }}
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg bg-gray-100 h-[160px] flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  <span className="text-2xl block mb-2">🔒</span>
                  {sigExpoRef.current && !sigExpoRef.current.isEmpty()
                    ? "Firma salvata - Attiva per modificare"
                    : "Attiva per firmare"}
                </p>
              </div>
            )}

            {isSigExpoActive && (
              <button
                onClick={clearExpo}
                type="button"
                className="text-sm text-blue-700 underline hover:text-orange-400 transition-colors"
              >
                Cancella firma Expo
              </button>
            )}
          </div>

          {/* FIRMA PROCACCIATORE */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-orange-400 font-semibold text-sm sm:text-base">
                Firma Procacciatore
              </p>
              <button
                onClick={toggleProc}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isSigProcActive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
                type="button"
              >
                {isSigProcActive ? "🔓 Disattiva" : "🔒 Attiva"}
              </button>
            </div>

            {isSigProcActive ? (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigProcRef}
                  penColor="black"
                  canvasProps={{
                    width: 800,
                    height: 120,
                    className: "rounded-md",
                  }}
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg bg-gray-100 h-[160px] flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  <span className="text-2xl block mb-2">🔒</span>
                  {sigProcRef.current && !sigProcRef.current.isEmpty()
                    ? "Firma salvata - Attiva per modificare"
                    : "Attiva per firmare"}
                </p>
              </div>
            )}

            {isSigProcActive && (
              <button
                onClick={clearProc}
                type="button"
                className="text-sm text-blue-700 underline hover:text-orange-400 transition-colors"
              >
                Cancella firma Procacciatore
              </button>
            )}
          </div>
        </div>

        {/* AZIONI */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-2">
          <button
            onClick={generaPdfPreview}
            disabled={isGenerating}
            className="w-full sm:w-auto bg-orange-300 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-full transition-colors duration-200"
            type="button"
          >
            {isGenerating ? "Generazione..." : "Genera Anteprima PDF"}
          </button>

          <button
            onClick={scaricaPdf}
            disabled={!pdfUrl}
            className={`w-full sm:w-auto ${
              pdfUrl
                ? "bg-yellow-400 hover:bg-yellow-500"
                : "bg-gray-300 cursor-not-allowed"
            } text-black font-semibold px-6 py-3 rounded-full transition-colors duration-200`}
            type="button"
          >
            Scarica PDF
          </button>

          <button
            type="button"
            onClick={handleSubmitToBackoffice}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-md transition duration-200 transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? "Invio in corso..." : "Invia a Backoffice"}
          </button>

          <button
            type="button"
            onClick={handleStartYousignSignature}
            disabled={isStartingYousign || !pdfUrl}
            className={`w-full sm:w-auto ${
              pdfUrl
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-gray-300 cursor-not-allowed"
            } text-white font-semibold px-6 py-3 rounded-full shadow-md transition duration-200 transform hover:scale-105 disabled:transform-none`}
          >
            {isStartingYousign
              ? "Avvio firma..."
              : "Avvia firma digitale Yousign"}
          </button>
        </div>

        {/* STATUS INVIO */}
        {submitStatus === "success" && (
          <div className="text-center text-green-700 font-semibold">
            Inviato al backoffice ✅
          </div>
        )}
        {submitStatus === "error" && (
          <div className="text-center text-red-600 font-semibold">
            Errore invio ❌ (controlla console)
          </div>
        )}

        {yousignStatus === "success" && (
          <div className="space-y-3 text-center text-emerald-700 font-semibold">
            <p>
              Richiesta Yousign creata. Il firmatario ricevera la mail per
              firma e OTP.
            </p>
            {yousignSignatureRequestId && (
              <button
                type="button"
                onClick={handleSendSignedDocument}
                disabled={isSendingSignedDocument}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSendingSignedDocument
                  ? "Invio documento..."
                  : "Invia documento firmato a contratti"}
              </button>
            )}
            {signedDocumentStatus === "success" && (
              <p>Documento firmato inviato a contratti@davveroo.it.</p>
            )}
            {signedDocumentStatus === "error" && (
              <p className="text-red-600">Invio documento firmato non riuscito.</p>
            )}
          </div>
        )}
        {yousignStatus === "error" && (
          <div className="text-center text-red-600 font-semibold">
            Errore avvio Yousign. Controlla i dati del firmatario.
          </div>
        )}

        {/* ANTEPRIMA */}
        {pdfUrl && (
          <div className="pt-4">
            <h3 className="text-lg sm:text-xl font-semibold text-center text-blue-900 mb-3">
              Anteprima
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-[450px] sm:h-[600px]"
                title="Anteprima PDF"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
