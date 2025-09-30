// CompilerDojo.jsx
// - Riepilogo comparazione nel PDF: titolo bold, righe separate, valori in grassetto
// - Fix WinAnsi per pdf-lib StandardFonts
// - UI web realtime invariata (simulatore + form + upload + anteprima)

import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const CompilerDojo = () => {
  // ======= Util =======
  const euro = (v) => {
    const n = Number(v || 0);
    return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  };

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

  // ======= Stato simulatore (realtime UI) =======
  const [sim, setSim] = useState({
    transato: "", // € al mese
    scontrino: "",
    mode: "percentuale", // "percentuale" | "fissa"
    attualeValore: "1.95",
    dojoValore: "0.80",
    includiCanone: true,
  });

  const handleSimChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSim((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  function computeSimulation() {
    const transato = parseFloat(String(sim.transato).replace(",", ".")) || 0;
    const scontrino = parseFloat(String(sim.scontrino).replace(",", ".")) || 0;
    const attualeVal =
      parseFloat(String(sim.attualeValore).replace(",", ".")) || 0;
    const dojoVal = parseFloat(String(sim.dojoValore).replace(",", ".")) || 0;

    const nTx = scontrino > 0 ? transato / scontrino : 0;

    const costoAttuale =
      sim.mode === "fissa" ? nTx * attualeVal : transato * (attualeVal / 100);
    const costoDojo =
      sim.mode === "fissa" ? nTx * dojoVal : transato * (dojoVal / 100);

    const canoneAtt =
      parseFloat(String(formData.canone || 0).replace(",", ".")) || 0;
    const canoneDojo =
      parseFloat(String(formData.canonedojo || 0).replace(",", ".")) || 0;

    const costoAttTot = sim.includiCanone
      ? costoAttuale + canoneAtt
      : costoAttuale;
    const costoDojoTot = sim.includiCanone ? costoDojo + canoneDojo : costoDojo;

    const risparmio = Math.max(0, costoAttTot - costoDojoTot);
    const rispPerc = costoAttTot > 0 ? (risparmio / costoAttTot) * 100 : 0;

    return {
      transato,
      scontrino,
      nTx,
      costoAttuale,
      costoDojo,
      canoneAtt,
      canoneDojo,
      costoAttTot,
      costoDojoTot,
      risparmio,
      rispPerc,
      attualeVal,
      dojoVal,
    };
  }

  // ======= Stato form e allegati =======
  const [formData, setFormData] = useState({
    partnermanager: "",
    email: "",
    iban: "",
    cell: "",
    ragione: "",
    indirizzo: "",
    debito: "",
    credito: "",
    business: "",
    offdebito: "",
    offcredito: "",
    offbusiness: "",
    marchio: "",
    info: "",

    // NUOVI CAMPI
    canone: "",
    canonedojo: "",
    transatoCredito: "",
    transatoDebito: "",
    scontrinoMedio: "",
    scontrinoMassimo: "",
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

  const API_CLIENTE = "https://bc.davveroo.it/api/sendToClient";

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

  // ======= Generazione PDF =======
  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/modellodojo.pdf").then((res) =>
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

    // Disegna una singola riga "Etichetta: Valore", con valore in grassetto.
    // Gestisce il wrapping della parte Valore se supera il maxWidth.
    const drawLineLabelValue = (
      label,
      value,
      x,
      y,
      { size = 16, maxWidth = 560, lineHeight = 22 } = {}
    ) => {
      const safeLabel = sanitizeForWinAnsi(label);
      const safeValue = sanitizeForWinAnsi(value);

      // Disegna l'etichetta (regular)
      page.drawText(safeLabel + ": ", {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });

      // Calcola x di partenza del valore
      const labelWidth = font.widthOfTextAtSize(safeLabel + ": ", size);
      const valueStartX = x + labelWidth;

      // Se il valore supera maxWidth, wrappiamo il valore su nuove righe
      const availableWidth = Math.max(20, maxWidth - labelWidth);
      const words = safeValue.split(/\s+/);
      let line = "";
      let cursorY = y;

      for (let i = 0; i < words.length; i++) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        const testWidth = fontBold.widthOfTextAtSize(testLine, size);
        if (testWidth <= availableWidth) {
          line = testLine;
        } else {
          // Disegna la parte accumulata
          page.drawText(line, {
            x: valueStartX,
            y: cursorY,
            size,
            font: fontBold,
            color: rgb(0, 0, 0),
          });
          // nuova riga: label non più ripetuta, si parte da x originale
          cursorY -= lineHeight;
          line = words[i];
          // per la riga successiva, tutto il valore occupa la larghezza maxWidth
          // quindi se c'è ulteriore wrapping, ripartiamo da x base (non valueStartX)
          while (true) {
            const nextWidth = fontBold.widthOfTextAtSize(line, size);
            if (nextWidth <= maxWidth) break;
          }
          // da qui in poi useremo x base per eventuali altre righe
          const rest = words.slice(i + 1).join(" ");
          if (rest) {
            // delega il wrapping delle righe successive all'helper multiline
            drawMultilineText(line + " " + rest, x, cursorY, {
              size,
              maxWidth,
              lineHeight,
              whichFont: fontBold,
            });
            return (
              cursorY -
              lineHeight *
                Math.ceil(fontBold.widthOfTextAtSize(line, size) / maxWidth)
            );
          }
        }
      }

      // Disegna l'ultima riga (o l'unica)
      page.drawText(line, {
        x: valueStartX,
        y: cursorY,
        size,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      return cursorY - lineHeight;
    };

    const drawLinesLabelValue = (
      items, // [{label, value}]
      x,
      y,
      opts = {}
    ) => {
      let cursorY = y;
      for (const it of items) {
        cursorY = drawLineLabelValue(it.label, it.value, x, cursorY, opts);
      }
      return cursorY;
    };

    // Disegna coppie Label: Valore in orizzontale con sfondi verdi per dare evidenza
    const drawInlineLabelValuePairs = (
      items, // [{label, value}]
      x,
      y,
      {
        size = 16,
        lineHeight = 22,
        maxWidth = 560,
        gap = 24,
        // Stili (0..1)
        labelBg = { r: 0.86, g: 0.97, b: 0.86 }, // verde chiaro
        valueBg = { r: 0.78, g: 0.93, b: 0.78 }, // verde medio
        risparmioValueBg = { r: 0.65, g: 0.89, b: 0.65 }, // accento per Risparmio
        labelColor = { r: 0.05, g: 0.25, b: 0.05 }, // testo etichetta
        valueColor = { r: 0.00, g: 0.40, b: 0.00 }, // testo valore
        paddingX = 4,
        paddingY = 2,
        boxOpacity = 0.9,
      } = {}
    ) => {
      let currX = x;
      let currY = y;
      const rowMaxX = x + maxWidth;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const safeLabel = sanitizeForWinAnsi(String(it.label || "")) + ": ";
        const safeValue = sanitizeForWinAnsi(String(it.value || ""));

        const labelW = font.widthOfTextAtSize(safeLabel, size);
        const valueW = fontBold.widthOfTextAtSize(safeValue, size);
        const pairW = labelW + valueW + (i < items.length - 1 ? gap : 0);

        // Se non ci stiamo in riga, vai a capo
        if (currX + pairW > rowMaxX) {
          currX = x;
          currY -= lineHeight;
        }

        // Background etichetta
        page.drawRectangle({
          x: currX - paddingX,
          y: currY - paddingY,
          width: labelW + paddingX * 2,
          height: size + paddingY * 2,
          color: rgb(labelBg.r, labelBg.g, labelBg.b),
          opacity: boxOpacity,
        });
        // Testo etichetta
        page.drawText(safeLabel, {
          x: currX,
          y: currY,
          size,
          font,
          color: rgb(labelColor.r, labelColor.g, labelColor.b),
        });

        const valueX = currX + labelW;
        const isRisparmio = safeLabel.trim().toLowerCase().startsWith("risparmio:");
        const vb = isRisparmio ? risparmioValueBg : valueBg;

        // Background valore
        page.drawRectangle({
          x: valueX - paddingX,
          y: currY - paddingY,
          width: valueW + paddingX * 2,
          height: size + paddingY * 2,
          color: rgb(vb.r, vb.g, vb.b),
          opacity: boxOpacity,
        });
        // Testo valore (bold)
        page.drawText(safeValue, {
          x: valueX,
          y: currY,
          size,
          font: fontBold,
          color: rgb(valueColor.r, valueColor.g, valueColor.b),
        });

        // Avanza il cursore in orizzontale
        currX += labelW + valueW + gap;
      }

      return currY - lineHeight;
    };

    // ========= COMPILAZIONE PDF =========
    // campi esistenti
    drawText(formData.partnermanager, 555, 1045, 21);
    drawText(formData.ragione, 230, 1202, 20);
    drawText(formData.cell, 160, 1095, 20);
    drawText(formData.email, 500, 1095, 20);
    drawText(formData.iban, 120, 1045, 17);
    drawMultilineText(formData.indirizzo || "", 350, 1170, {
      size: 15,
      maxWidth: 300,
      lineHeight: 18,
    });
    drawText(formData.debito, 200, 855, 19);
    drawText(formData.offdebito, 570, 855, 19);
    drawText(formData.credito, 200, 895, 19);
    drawText(formData.offcredito, 570, 895, 19);
    drawText(formData.business, 200, 813, 19);
    drawText(formData.offbusiness, 570, 813, 19);
    drawText(formData.marchio, 220, 1135, 20);
    drawMultilineText(formData.info || "", 167, 340, {
      size: 18,
      maxWidth: 590,
      lineHeight: 18,
    });

    // nuovi campi
    drawText(formData.canone, 200, 765, 18);
    drawText(formData.canonedojo, 510, 765, 18);
    drawText(formData.transatoCredito, 250, 710, 18);
    drawText(formData.transatoDebito, 250, 675, 18);
    drawText(formData.scontrinoMedio, 570, 710, 18);
    drawText(formData.scontrinoMassimo, 585, 675, 18);

    // === RIEPILOGO TESTUALE (una riga per voce, valori in bold) ===
    const r = computeSimulation();
    const unitAtt =
      sim.mode === "percentuale"
        ? `${r.attualeVal}%`
        : `${euro(r.attualeVal)}/tx`;
    const unitDojo =
      sim.mode === "percentuale" ? `${r.dojoVal}%` : `${euro(r.dojoVal)}/tx`;

    // Titolo spostato 40px a sx e 20px giù rispetto alla tua versione originale
    drawText("Riepilogo comparazione", 75, 530, 18, fontBold);

    const items = [
      { label: "Transato", value: euro(r.transato)},
      { label: "Tariffa attuale", value: unitAtt },
      { label: "Tariffa Dojo", value: unitDojo },
      { label: "Totale attuale", value: euro(r.costoAttTot) },
      { label: "Totale Dojo", value: euro(r.costoDojoTot) },
      {
        label: "Risparmio",
        value: `${euro(r.risparmio)} (${r.rispPerc.toFixed(1)}%)`,
      },
    ];

    drawInlineLabelValuePairs(items, 75, 510, {
      size: 16,
      lineHeight: 22,
      maxWidth: 590,
      gap: 24,
    });
    // === fine riepilogo ===

    // Firme
    const firma1 = getFirmaImage();
    if (firma1) {
      const bytes = await fetch(firma1).then((r) => r.arrayBuffer());
      const png = await pdfDoc.embedPng(bytes);
      page.drawImage(png, { x: 485, y: 105, width: 150, height: 50 });
    }
    const firma2 = sigCanvasRef2.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    if (firma2) {
      const bytes2 = await fetch(firma2).then((r) => r.arrayBuffer());
      const png2 = await pdfDoc.embedPng(bytes2);
      page.drawImage(png2, { x: 85, y: 105, width: 150, height: 50 });
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
    setSubmitStatus(null);
    setIsSubmitting(true);
    try {
      const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
      const pdfFile = new File([pdfBlob], "modulo.pdf", {
        type: "application/pdf",
      });
      const allFiles = [pdfFile, ...files];
      const totalBytes = allFiles.reduce((s, f) => s + getFileSize(f), 0);
      if (totalBytes > MAX_TOTAL_BYTES)
        throw new Error(
          `Allegati troppo pesanti (${(totalBytes / 1024 / 1024).toFixed(
            2
          )} MB).`
        );

      const attachments = await Promise.all(
        allFiles.map(async (file) => ({
          filename: file.name,
          base64: await convertFileToBase64(file),
        }))
      );

      const payload = {
        nome: formData.ragione?.trim() || "Senza nome",
        email: formData.email?.trim() || "noreply@local",
        telefono: formData.cell?.trim() || "",
        messaggio: formData.info || "",
        attachments, // /api/sendToClient si aspetta questo nome
      };

      const res = await fetch(API_CLIENTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${text || "no body"}`);

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
            name="indirizzo"
            placeholder="Indirizzo sede attivazione POS"
            value={formData.indirizzo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base sm:col-span-2"
          />
        </div>

        {/* Condizioni attuali vs Dojo */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Condizioni attuali e Offerte
          </h3>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm sm:text-base">
                Condizioni attuali
              </h4>
              <input
                name="credito"
                placeholder="Credito (CNS)"
                value={formData.credito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="debito"
                placeholder="Debito (CNS)"
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
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm sm:text-base">
                Condizioni Dojo
              </h4>
              <input
                name="offcredito"
                placeholder="Credito"
                value={formData.offcredito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="offdebito"
                placeholder="Debito"
                value={formData.offdebito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <input
                name="offbusiness"
                placeholder="Business"
                value={formData.offbusiness}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Canoni */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <input
              name="canone"
              placeholder="Canone mensile"
              value={formData.canone}
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

          {/* Transati/Scontrini */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <input
              name="transatoCredito"
              placeholder="Transato mese credito"
              value={formData.transatoCredito}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="scontrinoMedio"
              placeholder="Scontrino medio"
              value={formData.scontrinoMedio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="transatoDebito"
              placeholder="Transato mese debito"
              value={formData.transatoDebito}
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

        {/* === Simulatore Risparmio (realtime sulla pagina) === */}
        <div className="space-y-4 border border-blue-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Simulatore risparmio
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Transato mensile (€)
              </label>
              <input
                name="transato"
                type="number"
                min="0"
                step="0.01"
                value={sim.transato}
                onChange={handleSimChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="es. 1500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Scontrino medio (€){" "}
                {sim.mode === "fissa" ? "(obbligatorio)" : "(opzionale)"}
              </label>
              <input
                name="scontrino"
                type="number"
                min="0"
                step="0.01"
                value={sim.scontrino}
                onChange={handleSimChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="es. 20"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Tariffa ATTUALE {sim.mode === "percentuale" ? "(%)" : "(€/tx)"}
              </label>
              <input
                name="attualeValore"
                type="number"
                min="0"
                step="0.01"
                value={sim.attualeValore}
                onChange={handleSimChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={
                  sim.mode === "percentuale" ? "es. 1.95" : "es. 0.15"
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Tariffa DOJO {sim.mode === "percentuale" ? "(%)" : "(€/tx)"}
              </label>
              <input
                name="dojoValore"
                type="number"
                min="0"
                step="0.01"
                value={sim.dojoValore}
                onChange={handleSimChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={
                  sim.mode === "percentuale" ? "es. 0.80" : "es. 0.05"
                }
              />
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="includiCanone"
                  checked={sim.includiCanone}
                  onChange={handleSimChange}
                />
                Includi canoni mensili
              </label>
            </div>
          </div>

          {/* Pannello risultati in tempo reale */}
          {(() => {
            const r = computeSimulation();
            return (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">
                      Costo ATTUALE {sim.includiCanone ? "+ canone" : ""}
                    </p>
                    <p className="text-lg font-semibold">
                      {euro(r.costoAttTot)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">
                      Costo con DOJO {sim.includiCanone ? "+ canone" : ""}
                    </p>
                    <p className="text-lg font-semibold">
                      {euro(r.costoDojoTot)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Risparmio</p>
                    <p className="text-2xl font-bold text-green-700">
                      {euro(r.risparmio)}
                    </p>
                    <p className="text-xs text-green-700 font-medium">
                      ({r.rispPerc.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
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
