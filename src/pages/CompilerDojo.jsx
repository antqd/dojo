// CompilerDojo.jsx
// - Fix WinAnsi per pdf-lib StandardFonts
// - UI per compilare il modulo PDF con allegati e firme

import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const CompilerDojo = () => {
  // Sanifica caratteri non supportati da Helvetica (WinAnsi)
  const sanitizeForWinAnsi = (input) => {
    let s = String(input ?? "");
    return s
      .replace(/\u2013|\u2014|\u2212/g, "-") // – — −
      .replace(/\u2192|\u27A1/g, "->") // → ➡
      .replace(/\u2022|\u25CF/g, "*") // • ●
      .replace(/\u00A0/g, " ")
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, ""); // emoji
  };

  // ======= Stato form e allegati =======
  const [formData, setFormData] = useState({
    partnermanager: "",
    email_pmanager: "",
    attualeGestore: "",
    email: "",
    iban: "",
    cell: "",
    ragione: "",
    indirizzo: "",
    indirizzo2: "",
    indirizzo3: "",
    debito: "",
    credito: "",
    business: "",
    marchio: "",
    info: "",
    canonedojo: "",
    scontrinoMedio: "",
    scontrinoMassimo: "",
    transatoAnnuo: "",
    // NUOVE CARTE
    amex: "",
    stf: "",
    // RANGE VOLUME
    volume0_50k: false,
    volume50_150k: false,
    volume150_250k: false,
  });

  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSignature1Active, setIsSignature1Active] = useState(false);
  const [isSignature2Active, setIsSignature2Active] = useState(false);

  const sigCanvasRef = useRef();
  const sigCanvasRef2 = useRef();

  const API_CLIENTE = "https://api.davveroo.it/api/email/attivazione";

  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error("File non definito"));
      if (!(file instanceof File) && !(file instanceof Blob))
        return reject(new Error("Parametro non è un file valido"));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(reader.result.split(",")[1]);
        } catch (err) {
          reject(new Error("Errore parsing base64: " + err.message));
        }
      };
      reader.onerror = (err) =>
        reject(new Error("Errore lettura file: " + err.message));
      reader.readAsDataURL(file);
    });

  const getFirmaImage = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return null;
    return sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
  };
  const clearFirma = () => sigCanvasRef.current?.clear();
  const clearFirma2 = () => sigCanvasRef2.current?.clear();

  const toggleSignature1 = () => setIsSignature1Active((v) => !v);
  const toggleSignature2 = () => setIsSignature2Active((v) => !v);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckboxChange = (name) => (e) =>
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));

  const handleFileChange = (event, sectionName) => {
    const selectedFiles = Array.from(event.target.files);
    selectedFiles.forEach((file) => {
      Object.defineProperty(file, "section", {
        value: sectionName,
        enumerable: true,
      });
      setFiles((prev) => [...prev, file]);
      if (file.type.startsWith("image/")) {
        const r = new FileReader();
        r.onload = (ev) =>
          setFilePreviews((p) => [
            ...p,
            {
              src: ev.target.result,
              section: sectionName,
              name: file.name,
              type: file.type,
            },
          ]);
        r.readAsDataURL(file);
      } else {
        setFilePreviews((p) => [
          ...p,
          { src: null, section: sectionName, name: file.name, type: file.type },
        ]);
      }
    });
  };
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };
  const getFilesBySection = (sectionName) =>
    filePreviews.filter((preview) => preview.section === sectionName);

  // ======= Generazione PDF =======
  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/moduloDojo.pdf").then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Font standard
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.getPages()[0];

    const drawText = (text, x, y, size = 12, whichFont = font) => {
      page.drawText(sanitizeForWinAnsi(text), {
        x,
        y,
        size,
        font: whichFont,
        color: rgb(0, 0, 0),
      });
    };

    // Testo multi-linea con wrapping e \n
    const drawMultilineText = (
      text,
      x,
      y,
      { size = 12, maxWidth = 560, lineHeight = 16, whichFont = font } = {}
    ) => {
      const blocks = String(text ?? "").split(/\n/);
      let cursorY = y;
      for (const block of blocks) {
        const content = sanitizeForWinAnsi(block);
        if (!content) {
          cursorY -= lineHeight;
          continue;
        }
        const words = content.split(/\s+/);
        let line = "";
        for (let i = 0; i < words.length; i++) {
          const testLine = line ? `${line} ${words[i]}` : words[i];
          const testWidth = whichFont.widthOfTextAtSize(testLine, size);
          if (testWidth <= maxWidth) {
            line = testLine;
          } else {
            page.drawText(line, {
              x,
              y: cursorY,
              size,
              font: whichFont,
              color: rgb(0, 0, 0),
            });
            cursorY -= lineHeight;
            line = words[i];
          }
        }
        if (line) {
          page.drawText(line, {
            x,
            y: cursorY,
            size,
            font: whichFont,
            color: rgb(0, 0, 0),
          });
          cursorY -= lineHeight;
        }
      }
      return cursorY;
    };

    // ========= COMPILAZIONE PDF =========
    // campi esistenti
    drawText(formData.partnermanager, 470, 1323, 21);
    drawText(formData.email_pmanager, 470, 1290, 18);
    drawText(formData.ragione, 310, 1170, 20);
    drawText(formData.attualeGestore, 100, 880, 18);
    drawText(formData.cell, 130, 1125, 20);
    drawText(formData.email, 470, 1125, 20);
    drawText(formData.iban, 125, 1080, 20);
    drawMultilineText(formData.indirizzo || "", 260, 1200, {
      size: 15,
      maxWidth: 500,
      lineHeight: 18,
    });
    drawMultilineText(formData.indirizzo2 || "", 260, 1030, {
      size: 20,
      maxWidth: 300,
      lineHeight: 18,
    });
    drawMultilineText(formData.indirizzo3 || "", 260, 1000, {
      size: 20,
      maxWidth: 300,
      lineHeight: 18,
    });
    drawText(formData.debito, 600, 690, 19);
    drawText(formData.credito, 600, 730, 19);
    drawText(formData.business, 600, 650, 19);
    drawText(formData.amex, 600, 610, 18);
    drawText(formData.stf, 520, 573, 18);
    if (formData.volume0_50k) drawText("X", 55, 767, 19);
    if (formData.volume50_150k) drawText("X", 55, 688, 19);
    if (formData.volume150_250k) drawText("X", 55, 605, 19);
    drawText(formData.marchio, 190, 1240, 20);
    drawMultilineText(formData.info || "", 55, 375, {
      size: 18,
      maxWidth: 590,
      lineHeight: 18,
    });

    // nuovi campi
    drawText(formData.canonedojo, 600, 770, 18);
    drawText(formData.scontrinoMedio, 645, 510, 18);
    drawText(formData.scontrinoMassimo, 645, 478, 18);
    drawText(formData.transatoAnnuo, 320, 915, 18);
  

    // Firme
    const firma1 = getFirmaImage();
    if (firma1) {
      const bytes = await fetch(firma1).then((r) => r.arrayBuffer());
      const png = await pdfDoc.embedPng(bytes);
      page.drawImage(png, { x: 485, y: 125, width: 180, height: 50 });
    }
    const firma2 = sigCanvasRef2.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    if (firma2) {
      const bytes2 = await fetch(firma2).then((r) => r.arrayBuffer());
      const png2 = await pdfDoc.embedPng(bytes2);
      page.drawImage(png2, { x: 85, y: 125, width: 180, height: 50 });
    }

    // Salva e mostra anteprima
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const scaricaPdf = () => pdfUrl && saveAs(pdfUrl, "modulo_compilato.pdf");

  // ======= Invio backoffice =======
  const getFileSize = (f) => f?.size ?? 0;
  const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

async function handleSubmitToClient() {
  if (!pdfUrl) return alert("Genera prima il PDF.");

  // 🔒 destinatario fisso backoffice
  const destinatario = "info@davveroo.it";

  setSubmitStatus(null);
  setIsSubmitting(true);

  try {
    const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
    const pdfFile = new File([pdfBlob], "modulo_attivazione_dojo.pdf", {
      type: "application/pdf",
    });

    const allFiles = [pdfFile, ...files];
    const totalBytes = allFiles.reduce((s, f) => s + (f?.size ?? 0), 0);

    if (totalBytes > 8 * 1024 * 1024) {
      throw new Error(
        `Allegati troppo pesanti (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`
      );
    }

    const attachments = await Promise.all(
      allFiles.map(async (file) => ({
        filename: file.name,
        base64: await convertFileToBase64(file),
      }))
    );

    // 🧠 testo email chiaro e leggibile
    const messaggioEmail = `
MODULO ATTIVAZIONE DOJO

Ragione sociale: ${formData.ragione || "-"}
Marchio: ${formData.marchio || "-"}
Email: ${formData.email || "-"}
Telefono: ${formData.cell || "-"}
IBAN: ${formData.iban || "-"}

Partner Manager: ${formData.partnermanager || "-"}
Email Partner Manager: ${formData.email_pmanager || "-"}

Attuale gestore: ${formData.attualeGestore || "-"}

Carte:
Amex: ${formData.amex || "-"}
STF: ${formData.stf || "-"}

Range di Volume:
0-50k: ${formData.volume0_50k ? "SI" : "NO"}
50k-150k: ${formData.volume50_150k ? "SI" : "NO"}
150k-250k: ${formData.volume150_250k ? "SI" : "NO"}

Transato Annuo: ${formData.transatoAnnuo || "-"}

Note:
${formData.info || "-"}
`.trim();

    const payload = {
      // campi "umani"
      nome: formData.ragione?.trim() || "Senza nome",
      email: formData.email?.trim() || "",
      telefono: formData.cell?.trim() || "",
      email_pmanager: formData.email_pmanager?.trim() || "",

      // corpo email
      messaggio: messaggioEmail,

      // 🔥 CAMPI EMAIL (come CompilerAdesione)
      to: destinatario,
      subject: "Attivazione DOJO",

      attachments,
    };

    const res = await fetch(API_CLIENTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${text || "no body"}`);
    }

    setSubmitStatus("success");
    alert("Email inviata correttamente.");
  } catch (err) {
    console.error(err);
    setSubmitStatus("error");
    alert(`Errore durante l'invio: ${err.message}`);
  } finally {
    setIsSubmitting(false);
  }
}


  // ======= UI =======
  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 text-center">
          Compilazione modulo PDF
        </h2>

        {/* Dati principali */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            name="ragione"
            placeholder="Ragione Sociale"
            value={formData.ragione}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="marchio"
            placeholder="Marchio/Insegna"
            value={formData.marchio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="attualeGestore"
            placeholder="Attuale gestore"
            value={formData.attualeGestore}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="cell"
            placeholder="Cellulare"
            value={formData.cell}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="iban"
            placeholder="IBAN"
            value={formData.iban}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="partnermanager"
            placeholder="Partner Manager"
            value={formData.partnermanager}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="email_pmanager"
            placeholder="Email Partner Manager"
            value={formData.email_pmanager}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="indirizzo"
            placeholder="Indirizzo sede attivazione POS"
            value={formData.indirizzo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base sm:col-span-2"
          />
          <input
            name="indirizzo2"
            placeholder="Indirizzo 2"
            value={formData.indirizzo2}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base sm:col-span-2"
          />
          <input
            name="indirizzo3"
            placeholder="Indirizzo 3"
            value={formData.indirizzo3}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base sm:col-span-2"
          />
        </div>

        {/* Transato Annuo */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Transato Annuo
          </h3>
          <input
            name="transatoAnnuo"
            placeholder="Transato annuo"
            value={formData.transatoAnnuo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>

        {/* Flat Rate e Proposta Dojo Custom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flat Rate */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
              Flat Rate
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="checkbox"
                  checked={formData.volume0_50k}
                  onChange={handleCheckboxChange("volume0_50k")}
                />
                <span>0 - 50k (1%)</span>
              </label>
              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="checkbox"
                  checked={formData.volume50_150k}
                  onChange={handleCheckboxChange("volume50_150k")}
                />
                <span>50k - 150k (0.9%)</span>
              </label>
              <label className="flex items-center gap-2 text-sm sm:text-base">
                <input
                  type="checkbox"
                  checked={formData.volume150_250k}
                  onChange={handleCheckboxChange("volume150_250k")}
                />
                <span>150k - 250k (0.8%)</span>
              </label>
            </div>
          </div>

          {/* Proposta Dojo Custom */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
              Proposta Dojo Custom
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="credito"
                placeholder="Credito"
                value={formData.credito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="debito"
                placeholder="Debito"
                value={formData.debito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="business"
                placeholder="Business"
                value={formData.business}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="amex"
                placeholder="Amex"
                value={formData.amex}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="stf"
                placeholder="STF"
                value={formData.stf}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="canonedojo"
                placeholder="Canone mensile Dojo"
                value={formData.canonedojo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Scontrini */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Scontrini
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <input
              name="scontrinoMedio"
              placeholder="Scontrino medio"
              value={formData.scontrinoMedio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="scontrinoMassimo"
              placeholder="Scontrino massimo"
              value={formData.scontrinoMassimo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Note
          </h3>
          <textarea
            name="info"
            placeholder="Note"
            value={formData.info}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-24 resize-none"
          />
        </div>

        {/* Upload documenti */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 text-center">
            Caricamento Documenti
          </h2>

          {/* Visura Camerale */}
          <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-blue-900 flex items-center gap-2">
                📋 Visura Camerale
              </h3>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, "visura-camerale")}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-blue-50 file:text-blue-700
                 hover:file:bg-blue-100"
              />
              <div className="flex flex-wrap gap-4">
                {getFilesBySection("visura-camerale").map((preview, idx) => (
                  <div
                    key={`visura-${idx}`}
                    className="border border-gray-300 p-2 rounded-lg w-40 relative"
                  >
                    <button
                      onClick={() => removeFile(filePreviews.indexOf(preview))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                    <p className="text-xs font-medium break-words">
                      {preview.name}
                    </p>
                    {preview.type.startsWith("image/") ? (
                      <img
                        src={preview.src}
                        alt="Anteprima"
                        className="mt-2 max-h-32 w-full object-contain"
                      />
                    ) : (
                      <div className="mt-2 h-32 bg-gray-100 flex items-center justify-center rounded">
                        <p className="text-xs text-gray-600 text-center italic">
                          Anteprima non disponibile
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Identità + CF */}
          <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-green-900 flex items-center gap-2">
                🆔 Documenti Identità e Codice Fiscale
              </h3>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, "documenti-identita")}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-green-50 file:text-green-700
                 hover:file:bg-green-100"
              />
              <div className="flex flex-wrap gap-4">
                {getFilesBySection("documenti-identita").map((preview, idx) => (
                  <div
                    key={`identita-${idx}`}
                    className="border border-gray-300 p-2 rounded-lg w-40 relative"
                  >
                    <button
                      onClick={() => removeFile(filePreviews.indexOf(preview))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                    <p className="text-xs font-medium break-words">
                      {preview.name}
                    </p>
                    {preview.type.startsWith("image/") ? (
                      <img
                        src={preview.src}
                        alt="Anteprima"
                        className="mt-2 max-h-32 w-full object-contain"
                      />
                    ) : (
                      <div className="mt-2 h-32 bg-gray-100 flex items-center justify-center rounded">
                        <p className="text-xs text-gray-600 text-center italic">
                          Anteprima non disponibile
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Documento IBAN */}
          <div className="bg-white border border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-purple-900 flex items-center gap-2">
                🏦 Documento comprovante IBAN
              </h3>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, "documento-iban")}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-purple-50 file:text-purple-700
                 hover:file:bg-purple-100"
              />
              <div className="flex flex-wrap gap-4">
                {getFilesBySection("documento-iban").map((preview, idx) => (
                  <div
                    key={`iban-${idx}`}
                    className="border border-gray-300 p-2 rounded-lg w-40 relative"
                  >
                    <button
                      onClick={() => removeFile(filePreviews.indexOf(preview))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                    <p className="text-xs font-medium break-words">
                      {preview.name}
                    </p>
                    {preview.type.startsWith("image/") ? (
                      <img
                        src={preview.src}
                        alt="Anteprima"
                        className="mt-2 max-h-32 w-full object-contain"
                      />
                    ) : (
                      <div className="mt-2 h-32 bg-gray-100 flex items-center justify-center rounded">
                        <p className="text-xs text-gray-600 text-center italic">
                          Anteprima non disponibile
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Riepilogo file */}
          {files.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Riepilogo Documenti Caricati ({files.length})
              </h3>
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white p-3 rounded border"
                  >
                    <div>
                      <span className="font-medium">{file.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({file.section})
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Firme */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-6">
          {/* Firma richiedente */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold">
                Firma del richiedente
              </p>
              <button
                onClick={toggleSignature1}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isSignature1Active
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {isSignature1Active ? "Disattiva Firma" : "Attiva Firma"}
              </button>
            </div>
            {isSignature1Active ? (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{
                    width: 1000,
                    height: 150,
                    className: "rounded-md",
                  }}
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg bg-gray-100 h-[150px] flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  Clicca su "Attiva Firma" per firmare
                </p>
              </div>
            )}
            {isSignature1Active && (
              <button
                onClick={clearFirma}
                type="button"
                className="mt-2 text-sm text-blue-700 underline"
              >
                Cancella firma
              </button>
            )}
          </div>

          {/* Firma Partner Manager */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold">
                Firma Partner Manager
              </p>
              <button
                onClick={toggleSignature2}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isSignature2Active
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {isSignature2Active ? "Disattiva Firma" : "Attiva Firma"}
              </button>
            </div>
            {isSignature2Active ? (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvasRef2}
                  penColor="black"
                  canvasProps={{
                    width: 1000,
                    height: 150,
                    className: "rounded-md",
                  }}
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg bg-gray-100 h-[150px] flex items-center justify-center">
                <p className="text-gray-500 text-center">
                  Clicca su "Attiva Firma" per firmare
                </p>
              </div>
            )}
            {isSignature2Active && (
              <button
                onClick={clearFirma2}
                type="button"
                className="mt-2 text-sm text-blue-700 underline"
              >
                Cancella firma
              </button>
            )}
          </div>
        </div>

        {/* Pulsanti */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
          <button
            onClick={generaPdfPreview}
            className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-full"
          >
            Genera Anteprima PDF
          </button>
          <button
            onClick={scaricaPdf}
            disabled={!pdfUrl}
            className={`w-full sm:w-auto ${
              pdfUrl
                ? "bg-yellow-400 hover:bg-yellow-500"
                : "bg-gray-300 cursor-not-allowed"
            } text-black font-semibold px-6 py-3 rounded-full`}
          >
            Scarica PDF
          </button>
          <button
            type="button"
            onClick={handleSubmitToClient}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-md"
          >
            {isSubmitting ? "Invio in corso..." : "Invia a Backoffice"}
          </button>
        </div>

        {/* Anteprima PDF */}
        {pdfUrl && (
          <div className="pt-6">
            <h3 className="text-lg sm:text-xl font-semibold text-center text-blue-900 mb-4">
              Anteprima:
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
                title="Anteprima PDF"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompilerDojo;
