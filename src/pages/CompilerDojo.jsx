// CompilerDojo.jsx
// - Fix WinAnsi per pdf-lib StandardFonts
// - UI per compilare il modulo PDF con allegati e firme

import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const REQUIRED_FIELDS = [
  ["ragione", "Ragione Sociale"],
  ["partitaIva", "P.IVA"],
  ["codiceFiscale", "Codice Fiscale"],
  ["tipoAttivita", "Tipo Attività"],
  ["mailMerchant", "Mail Merchant"],
  ["sedeLegale", "Sede Legale"],
  ["sedeOperativa", "Sede Operativa"],
  ["iban", "IBAN"],
  ["transatoAnnuo", "Transato annuo stimato"],
  ["agente", "Agente"],
  ["mailAgente", "Mail Agente"],
  ["canonedojo", "Canone mensile"],
  ["noleggioPos", "Noleggio POS"],
  ["credito", "Carte Credit"],
  ["amex", "AMEX"],
  ["bancomat", "Bancomat"],
  ["debito", "Carte Debit"],
  ["info", "Note"],
];

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
    partitaIva: "",
    codiceFiscale: "",
    tipoAttivita: "",
    mailMerchant: "",
    iban: "",
    ragione: "",
    sedeLegale: "",
    sedeOperativa: "",
    agente: "",
    mailAgente: "",
    debito: "",
    credito: "",
    bancomat: "",
    amex: "",
    info: "",
    canonedojo: "",
    noleggioPos: "",
    transatoAnnuo: "",
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

  const validateRequiredFields = () => {
    const missingField = REQUIRED_FIELDS.find(
      ([name]) => !String(formData[name] ?? "").trim()
    );
    if (missingField) {
      const [name, label] = missingField;
      alert(`Compila il campo obbligatorio: ${label}.`);
      document.querySelector(`[name="${name}"]`)?.focus();
      return false;
    }

    for (const name of ["mailMerchant", "mailAgente"]) {
      const input = document.querySelector(`[name="${name}"]`);
      if (input && !input.checkValidity()) {
        input.reportValidity();
        input.focus();
        return false;
      }
    }

    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert("La firma merchant è obbligatoria.");
      setIsSignature1Active(true);
      return false;
    }
    if (!sigCanvasRef2.current || sigCanvasRef2.current.isEmpty()) {
      alert("La firma agente è obbligatoria.");
      setIsSignature2Active(true);
      return false;
    }
    return true;
  };

  // ======= Generazione PDF =======
  const generaPdfPreview = async () => {
    const templateResponse = await fetch("/moduloDojo.pdf");
    if (!templateResponse.ok) {
      throw new Error("Template moduloDojo.pdf non disponibile.");
    }
    const existingPdfBytes = await templateResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Font standard
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.getPages()[0];
    if (!page) throw new Error("Il template moduloDojo.pdf non contiene pagine.");

    const drawText = (text, x, y, size = 12, whichFont = font) => {
      page.drawText(sanitizeForWinAnsi(text), {
        x,
        y,
        size,
        font: whichFont,
        color: rgb(0, 0, 0),
      });
    };

    function drawTextFitted(
      text,
      x,
      y,
      { size = 11, maxWidth = 252, minSize = 7, whichFont = font } = {}
    ) {
      const safeText = sanitizeForWinAnsi(text);
      if (!safeText) return;
      const naturalWidth = whichFont.widthOfTextAtSize(safeText, size);
      const fittedSize =
        naturalWidth > maxWidth
          ? Math.max(minSize, (size * maxWidth) / naturalWidth)
          : size;
      drawText(safeText, x, y, fittedSize, whichFont);
    }

    // Testo multi-linea con wrapping e \n
    const drawMultilineText = (
      text,
      x,
      y,
      {
        size = 12,
        maxWidth = 560,
        lineHeight = 16,
        maxLines = Number.POSITIVE_INFINITY,
        whichFont = font,
      } = {}
    ) => {
      const blocks = String(text ?? "").split(/\n/);
      let cursorY = y;
      let linesDrawn = 0;
      for (const block of blocks) {
        if (linesDrawn >= maxLines) break;
        const content = sanitizeForWinAnsi(block);
        if (!content) {
          cursorY -= lineHeight;
          linesDrawn += 1;
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
            if (line) {
              if (linesDrawn >= maxLines) break;
              page.drawText(line, {
                x,
                y: cursorY,
                size,
                font: whichFont,
                color: rgb(0, 0, 0),
              });
              cursorY -= lineHeight;
              linesDrawn += 1;
            }
            line = words[i];
          }
        }
        if (line && linesDrawn < maxLines) {
          page.drawText(line, {
            x,
            y: cursorY,
            size,
            font: whichFont,
            color: rgb(0, 0, 0),
          });
          cursorY -= lineHeight;
          linesDrawn += 1;
        }
      }
      return cursorY;
    };

    // Coordinate del template aggiornato 810 x 1440 (origine: basso-sinistra).
    const merchantFields = [
      ["ragione", 1258],
      ["partitaIva", 1194],
      ["codiceFiscale", 1130],
      ["tipoAttivita", 1066],
      ["mailMerchant", 1002],
      ["sedeLegale", 938],
      ["sedeOperativa", 874],
      ["iban", 810],
      ["transatoAnnuo", 746],
      ["agente", 682],
      ["mailAgente", 608],
    ];
    merchantFields.forEach(([field, y]) =>
      drawTextFitted(formData[field], 420, y, {
        size: 17,
        maxWidth: 315,
        minSize: 10,
      })
    );

    drawTextFitted(formData.canonedojo, 305, 530, {
      size: 17,
      maxWidth: 125,
      minSize: 11,
      whichFont: fontBold,
    });
    drawTextFitted(formData.noleggioPos, 568, 530, {
      size: 17,
      maxWidth: 135,
      minSize: 11,
      whichFont: fontBold,
    });

    const proposalRows = [
      ["credito", 315, 430],
      ["amex", 312, 386],
      ["bancomat", 570, 430],
      ["debito", 575, 386],
    ];
    proposalRows.forEach(([field, x, y]) => {
      drawTextFitted(formData[field], x, y, {
        size: 17,
        maxWidth: 75,
        minSize: 11,
        whichFont: fontBold,
      });
    });

    drawMultilineText(formData.info, 75, 260, {
      size: 16,
      maxWidth: 660,
      lineHeight: 20,
      maxLines: 5,
    });

    // Firme
    const firma1 = getFirmaImage();
    if (firma1) {
      const bytes = await fetch(firma1).then((r) => r.arrayBuffer());
      const png = await pdfDoc.embedPng(bytes);
      page.drawImage(png, { x: 220, y: 110, width: 210, height: 58 });
    }
    const firma2 =
      sigCanvasRef2.current && !sigCanvasRef2.current.isEmpty()
        ? sigCanvasRef2.current.getTrimmedCanvas().toDataURL("image/png")
        : null;
    if (firma2) {
      const bytes2 = await fetch(firma2).then((r) => r.arrayBuffer());
      const png2 = await pdfDoc.embedPng(bytes2);
      page.drawImage(png2, { x: 555, y: 110, width: 190, height: 58 });
    }

    // Salva e mostra anteprima
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return url;
    });
  };

  const scaricaPdf = () => pdfUrl && saveAs(pdfUrl, "modulo_compilato.pdf");

  const handleGeneratePdf = async () => {
    if (!validateRequiredFields()) return;
    try {
      await generaPdfPreview();
    } catch (error) {
      console.error("Errore generazione PDF:", error);
      alert(`Impossibile generare il PDF: ${error.message}`);
    }
  };

  // ======= Invio backoffice =======
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

    if (totalBytes > MAX_TOTAL_BYTES) {
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
P.IVA: ${formData.partitaIva || "-"}
Codice fiscale: ${formData.codiceFiscale || "-"}
Tipo attività: ${formData.tipoAttivita || "-"}
Mail merchant: ${formData.mailMerchant || "-"}
Sede legale: ${formData.sedeLegale || "-"}
Sede operativa: ${formData.sedeOperativa || "-"}
IBAN: ${formData.iban || "-"}
Transato Annuo: ${formData.transatoAnnuo || "-"}
Agente: ${formData.agente || "-"}
Mail agente: ${formData.mailAgente || "-"}

Proposta:
Canone mensile: ${formData.canonedojo || "-"}
Noleggio POS: ${formData.noleggioPos || "-"}
Carte Credit: ${formData.credito || "-"}%
AMEX: ${formData.amex || "-"}%
Bancomat: ${formData.bancomat || "-"}%
Carte Debit: ${formData.debito || "-"}%

Note:
${formData.info || "-"}
`.trim();

    const payload = {
      // campi "umani"
      nome: formData.ragione?.trim() || "Senza nome",
      email: formData.mailMerchant.trim(),
      telefono: "",

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
        <p className="text-center text-sm text-red-700">
          Tutti i campi e le due firme sono obbligatori.
        </p>

        {/* Dati presenti nel nuovo template */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Dati merchant
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              ["ragione", "Ragione Sociale"],
              ["partitaIva", "P.IVA"],
              ["codiceFiscale", "Codice Fiscale"],
              ["tipoAttivita", "Tipo Attività"],
              ["mailMerchant", "Mail Merchant", "email"],
              ["iban", "IBAN"],
              ["sedeLegale", "Sede Legale"],
              ["sedeOperativa", "Sede Operativa"],
              ["transatoAnnuo", "Transato annuo stimato"],
              ["agente", "Agente"],
              ["mailAgente", "Mail Agente", "email"],
            ].map(([name, placeholder, type = "text"]) => (
              <input
                key={name}
                name={name}
                type={type}
                placeholder={`${placeholder} *`}
                value={formData[name]}
                onChange={handleChange}
                required
                aria-required="true"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            ))}
          </div>
        </div>

        {/* Proposta */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Proposta
          </h3>
          <input
            name="canonedojo"
            placeholder="Canone mensile in euro *"
            value={formData.canonedojo}
            onChange={handleChange}
            required
            aria-required="true"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <input
            name="noleggioPos"
            placeholder="Noleggio POS in euro *"
            value={formData.noleggioPos}
            onChange={handleChange}
            required
            aria-required="true"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          {[
            ["credito", "Carte Credit (%)"],
            ["amex", "AMEX (%)"],
            ["bancomat", "Bancomat (%)"],
            ["debito", "Carte Debit (%)"],
          ].map(([name, label]) => (
            <div key={name} className="flex items-center gap-3">
              <input
                name={name}
                placeholder={`${label} *`}
                value={formData[name]}
                onChange={handleChange}
                required
                aria-required="true"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Note e motivazioni fuori standard
          </h3>
          <textarea
            name="info"
            placeholder="Note *"
            value={formData.info}
            onChange={handleChange}
            required
            aria-required="true"
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
          {/* Firma merchant */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold">
                Firma Merchant *
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

          {/* Firma agente */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold">
                Firma Agente *
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
            onClick={handleGeneratePdf}
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

        {submitStatus === "success" && (
          <p className="text-center text-green-700 font-medium">
            Modulo inviato correttamente al backoffice.
          </p>
        )}
        {submitStatus === "error" && (
          <p className="text-center text-red-700 font-medium">
            Invio non riuscito. Controlla i dati e riprova.
          </p>
        )}

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
