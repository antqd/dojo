import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const CompilerAdesione = () => {
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

  // ======= Stato form e allegati =======
  const [formData, setFormData] = useState({
    // DATI AZIENDA
    ragioneSociale: "",
    partitaIva: "",
    codiceSdi: "",
    pec: "",
    codiceFiscaleAzienda: "",
    sedeCommerciale: "",
    citta: "",
    provincia: "",
    cellulareAzienda: "",
    mailAzienda: "",
    settoreMerceologico: "",
    iban: "",

    // LEGALE RAPPRESENTANTE
    legaleNomeCognome: "",
    legaleCodiceFiscale: "",
    legaleIndirizzo: "",
    legaleCellulare: "",
    legaleMail: "",

    // SERVIZIO / ECONOMICO
    descrizioneServizio: "",
    servizioPagaTreRate: false,
    servizioGiftCard: false,
    servizioPosVirtuale: false,
    servizioCardAziendali: false,
    servizioAltro: false,
    servizioAltroDescrizione: "",
    prezzoServizio1: "",
    prezzoServizio2: "",
    prezzoServizio3: "",
    prezzoServizio4: "",
    prezzoServizio5: "",

    // PERSONALE MANAGER
    personaleManagerNome: "",
    personaleManagerMail: "",
    personaleManagerCell: "",

    // NOTE & DATA
    note: "",
    dataContratto: "",
  });

  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSignatureClienteActive, setIsSignatureClienteActive] =
    useState(false);
  const [isSignatureManagerActive, setIsSignatureManagerActive] =
    useState(false);

  const sigCanvasClienteRef = useRef();
  const sigCanvasManagerRef = useRef();

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

  const getFirmaClienteImage = () => {
    if (!sigCanvasClienteRef.current || sigCanvasClienteRef.current.isEmpty())
      return null;
    return sigCanvasClienteRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");
  };
  const getFirmaManagerImage = () => {
    if (!sigCanvasManagerRef.current || sigCanvasManagerRef.current.isEmpty())
      return null;
    return sigCanvasManagerRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");
  };

  const clearFirmaCliente = () => sigCanvasClienteRef.current?.clear();
  const clearFirmaManager = () => sigCanvasManagerRef.current?.clear();

  const toggleSignatureCliente = () => setIsSignatureClienteActive((v) => !v);
  const toggleSignatureManager = () => setIsSignatureManagerActive((v) => !v);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleCheckboxChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.checked }));

  const handleFileChange = (event, sectionName) => {
    const selectedFiles = Array.from(event.target.files || []);
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

  const buildPrezziServiziText = () => {
    const lines = [];
    const pushLine = (label, value) => {
      const cleanValue = (value || "").trim();
      if (cleanValue) lines.push(`${label}: ${cleanValue}`);
    };

    pushLine("Servizio 1 - paga in 3 rate", formData.prezzoServizio1);
    pushLine(
      "Servizio 2 - pubblicazione Gift Card Davveroo.it",
      formData.prezzoServizio2
    );
    pushLine("Servizio 3 - pos virtuale", formData.prezzoServizio3);
    pushLine("Servizio 4 - emissione card aziendali", formData.prezzoServizio4);
    if ((formData.prezzoServizio5 || "").trim()) {
      const altLabel = formData.servizioAltroDescrizione?.trim()
        ? `Servizio 5 - Altro (${formData.servizioAltroDescrizione.trim()})`
        : "Servizio 5 - Altro";
      pushLine(altLabel, formData.prezzoServizio5);
    }

    return lines.join("\n");
  };

  // ======= Generazione PDF =======
  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/moduloadesionepartner1.pdf").then(
      (res) => res.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Font standard
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1] || pages[0];

    const drawTextOn = (
      page,
      text,
      x,
      y,
      size = 11,
      whichFont = font,
      color = rgb(0, 0, 0)
    ) => {
      page.drawText(sanitizeForWinAnsi(text || ""), {
        x,
        y,
        size,
        font: whichFont,
        color,
      });
    };

    const drawMultilineTextOn = (
      page,
      text,
      x,
      y,
      {
        size = 11,
        maxWidth = 520,
        lineHeight = 14,
        whichFont = font,
        color = rgb(0, 0, 0),
      } = {}
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
              color,
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
            color,
          });
          cursorY -= lineHeight;
        }
      }
      return cursorY;
    };

    // === COMPILAZIONE PAGINA 1 ===

    // Dati azienda (colonna sinistra)
    drawTextOn(page1, formData.ragioneSociale, 155, 725, 11);
    drawTextOn(page1, formData.partitaIva, 125, 705, 11);
    drawTextOn(page1, formData.codiceSdi, 122, 683, 11);
    drawTextOn(page1, formData.sedeCommerciale, 165, 665, 11);
    drawTextOn(page1, formData.citta, 95, 645, 11);
    drawTextOn(page1, formData.cellulareAzienda, 120, 625, 11);
    drawTextOn(page1, formData.settoreMerceologico, 200, 605, 11);

    // Dati azienda (colonna destra)
    drawTextOn(page1, formData.codiceFiscaleAzienda, 370, 707, 11);
    drawTextOn(page1, formData.pec, 290, 683, 11);
    drawTextOn(page1, formData.provincia, 470, 645, 11);
    drawTextOn(page1, formData.mailAzienda, 300, 629, 11);
    drawTextOn(page1, formData.iban, 390, 605, 11);

    // Legale rappresentante
    drawTextOn(page1, formData.legaleNomeCognome, 152, 526, 11);
    drawTextOn(page1, formData.legaleCodiceFiscale, 410, 525, 11);
    drawMultilineTextOn(page1, formData.legaleIndirizzo, 170, 507, {
      size: 11,
      maxWidth: 260,
      lineHeight: 13,
    });
    drawTextOn(page1, formData.legaleCellulare, 110, 485, 10);
    drawTextOn(page1, formData.legaleMail, 320, 488, 10);

    // Descrizione servizio + servizi selezionati
    const prezziServizi = buildPrezziServiziText();
    const descrizioneCompleta = [formData.descrizioneServizio, prezziServizi]
      .filter((v) => v && v.trim())
      .join("\n\n");
    drawMultilineTextOn(page1, descrizioneCompleta, 70, 275, {
      size: 11,
      maxWidth: 360,
      lineHeight: 13,
    });

    // Checkboxes sul template
    const checkboxMap = [
      { field: "servizioPagaTreRate", x: 38, y: 418 },
      { field: "servizioGiftCard", x: 38, y: 392 },
      { field: "servizioPosVirtuale", x: 38, y: 368 },
      { field: "servizioCardAziendali", x: 38, y: 342  },
      { field: "servizioAltro", x: 38, y: 315 },
    ];
    checkboxMap.forEach(({ field, x, y }) => {
      if (formData[field]) {
        drawTextOn(page1, "X", x, y, 12, fontBold);
      }
    });

    // Personale manager (in basso a sinistra)
    drawTextOn(page1, formData.personaleManagerNome, 140, 220, 9);
    drawTextOn(page1, formData.personaleManagerMail, 100, 205, 9);
    drawTextOn(page1, formData.personaleManagerCell, 110, 187, 9);

    // Note
    drawMultilineTextOn(page1, formData.note, 40, 110, {
      size: 11,
      maxWidth: 520,
      lineHeight: 13,
    });

    // Firma Partner Manager (opzionale) – prima pagina
    const firmaManager = getFirmaManagerImage();
    if (firmaManager) {
      const bytes = await fetch(firmaManager).then((r) => r.arrayBuffer());
      const png = await pdfDoc.embedPng(bytes);
      page1.drawImage(png, { x: 340, y: 150, width: 160, height: 45 });
    }

    // === COMPILAZIONE PAGINA 2 (data + firma cliente) ===
    if (page2) {
      if (formData.dataContratto) {
        drawTextOn(page2, formData.dataContratto, 84, 120, 11);
      }

      const firmaCliente = getFirmaClienteImage();
      if (firmaCliente) {
        const bytes = await fetch(firmaCliente).then((r) => r.arrayBuffer());
        const png = await pdfDoc.embedPng(bytes);
        page2.drawImage(png, { x: 380, y: 120, width: 180, height: 45 });
      }
    }

    // Salva e mostra anteprima
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const scaricaPdf = () =>
    pdfUrl && saveAs(pdfUrl, "modulo_adesione_expopay.pdf");

  // ======= Invio backoffice =======
  const getFileSize = (f) => f?.size ?? 0;
  const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

  async function handleSubmitToClient() {
    if (!pdfUrl) return alert("Genera prima il PDF.");

    // ---- VALIDAZIONE DESTINATARIO (per evitare No recipients defined) ----
    const destinatario =
      formData.personaleManagerMail?.trim() || formData.mailAzienda?.trim();
    if (!destinatario) {
      alert(
        "Inserisci almeno una mail destinataria (mail azienda o mail Partner Manager) prima di inviare."
      );
      return;
    }
    // ---------------------------------------------------------------------

    setSubmitStatus(null);
    setIsSubmitting(true);
    try {
      const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
      const pdfFile = new File([pdfBlob], "modulo_adesione_expopay.pdf", {
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

      const prezziServizi = buildPrezziServiziText();
      const prezziTextForEmail = prezziServizi
        ? `\n\nPrezzi servizi selezionati:\n${prezziServizi}`
        : "";

      const payload = {
        // dati "umani"
        nome: formData.ragioneSociale?.trim() || "Senza nome",
        email: destinatario,
        telefono: formData.cellulareAzienda?.trim() || "",
        messaggio:
          (formData.note ||
            `Modulo di adesione Davveroo - servizio: ${
              formData.descrizioneServizio || ""
            }`) + prezziTextForEmail,

        // *** campi usati da nodemailer sul backend ***
        to: destinatario,
        subject: `Nuovo modulo adesione Davveroo - ${
          formData.ragioneSociale || "Senza ragione sociale"
        }`,

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
          Modulo di adesione partner Davveroo
        </h2>

        {/* Dati aziendali */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Dati aziendali
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              name="ragioneSociale"
              placeholder="Ragione sociale"
              value={formData.ragioneSociale}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="partitaIva"
              placeholder="Partita IVA"
              value={formData.partitaIva}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="codiceSdi"
              placeholder="Codice SDI"
              value={formData.codiceSdi}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="pec"
              placeholder="PEC"
              value={formData.pec}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="codiceFiscaleAzienda"
              placeholder="Codice fiscale (se diverso)"
              value={formData.codiceFiscaleAzienda}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="sedeCommerciale"
              placeholder="Sede commerciale"
              value={formData.sedeCommerciale}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="citta"
              placeholder="Città"
              value={formData.citta}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="provincia"
              placeholder="Provincia"
              value={formData.provincia}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="cellulareAzienda"
              placeholder="Cellulare"
              value={formData.cellulareAzienda}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="mailAzienda"
              placeholder="Mail"
              value={formData.mailAzienda}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="settoreMerceologico"
              placeholder="Settore merceologico"
              value={formData.settoreMerceologico}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base sm:col-span-2"
            />
            <input
              name="iban"
              placeholder="IBAN"
              value={formData.iban}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base sm:col-span-2"
            />
          </div>
        </div>

        {/* Legale rappresentante */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Legale rappresentante
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              name="legaleNomeCognome"
              placeholder="Nome e cognome"
              value={formData.legaleNomeCognome}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="legaleCodiceFiscale"
              placeholder="Codice fiscale"
              value={formData.legaleCodiceFiscale}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="legaleIndirizzo"
              placeholder="Indirizzo di residenza"
              value={formData.legaleIndirizzo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base sm:col-span-2"
            />
            <input
              name="legaleCellulare"
              placeholder="Cellulare"
              value={formData.legaleCellulare}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="legaleMail"
              placeholder="Mail"
              value={formData.legaleMail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Servizio e parte economica */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Descrizione servizio e condizioni economiche
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-800">
              Seleziona i servizi e inserisci il prezzo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input
                    type="checkbox"
                    checked={formData.servizioPagaTreRate}
                    onChange={handleCheckboxChange("servizioPagaTreRate")}
                  />
                  Servizio 1 - paga in 3 rate
                </label>
                <input
                  name="prezzoServizio1"
                  placeholder="Prezzo servizio 1"
                  value={formData.prezzoServizio1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input
                    type="checkbox"
                    checked={formData.servizioGiftCard}
                    onChange={handleCheckboxChange("servizioGiftCard")}
                  />
                  Servizio 2 - pubblicazione Gift Card Davveroo.it
                </label>
                <input
                  name="prezzoServizio2"
                  placeholder="Prezzo servizio 2"
                  value={formData.prezzoServizio2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input
                    type="checkbox"
                    checked={formData.servizioPosVirtuale}
                    onChange={handleCheckboxChange("servizioPosVirtuale")}
                  />
                  Servizio 3 - pos virtuale
                </label>
                <input
                  name="prezzoServizio3"
                  placeholder="Prezzo servizio 3"
                  value={formData.prezzoServizio3}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input
                    type="checkbox"
                    checked={formData.servizioCardAziendali}
                    onChange={handleCheckboxChange("servizioCardAziendali")}
                  />
                  Servizio 4 - emissione card aziendali
                </label>
                <input
                  name="prezzoServizio4"
                  placeholder="Prezzo servizio 4"
                  value={formData.prezzoServizio4}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm sm:text-base">
                  <input
                    type="checkbox"
                    checked={formData.servizioAltro}
                    onChange={handleCheckboxChange("servizioAltro")}
                  />
                  Servizio 5 - Altro
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    name="servizioAltroDescrizione"
                    placeholder="Specifica il servizio 'Altro'"
                    value={formData.servizioAltroDescrizione}
                    onChange={handleChange}
                    disabled={!formData.servizioAltro}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                  />
                  <input
                    name="prezzoServizio5"
                    placeholder="Prezzo servizio 5 / Altro"
                    value={formData.prezzoServizio5}
                    onChange={handleChange}
                    disabled={!formData.servizioAltro}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
          <textarea
            name="descrizioneServizio"
            placeholder="Descrizione servizio (verrà inserita nell'area 'DESCRIZIONE SERVIZIO' del modulo)"
            value={formData.descrizioneServizio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-24 resize-none"
          />
        </div>

        {/* Personale manager */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Personale / Partner Manager ExpoPay
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <input
              name="personaleManagerNome"
              placeholder="Nome e cognome"
              value={formData.personaleManagerNome}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="personaleManagerMail"
              placeholder="Mail"
              value={formData.personaleManagerMail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="personaleManagerCell"
              placeholder="Cellulare"
              value={formData.personaleManagerCell}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Note e data contratto */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Note e data contratto
          </h3>
          <input
            name="dataContratto"
            placeholder="Data (es. 18/11/2025)"
            value={formData.dataContratto}
            onChange={handleChange}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <textarea
            name="note"
            placeholder="Note"
            value={formData.note}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-24 resize-none"
          />
        </div>

        {/* Upload documenti */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 text-center">
            Caricamento documenti (allegati al modulo)
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
                🆔 Documenti identità e Codice Fiscale legale rappresentante
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
                Riepilogo documenti caricati ({files.length})
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
          {/* Firma Cliente */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold">Firma Cliente</p>
              <button
                onClick={toggleSignatureCliente}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isSignatureClienteActive
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {isSignatureClienteActive ? "Disattiva firma" : "Attiva firma"}
              </button>
            </div>
            {isSignatureClienteActive ? (
              <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvasClienteRef}
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
                  Clicca su "Attiva firma" per firmare come cliente
                </p>
              </div>
            )}
            {isSignatureClienteActive && (
              <button
                onClick={clearFirmaCliente}
                type="button"
                className="mt-2 text-sm text-blue-700 underline"
              >
                Cancella firma
              </button>
            )}
          </div>

          {/* Firma Partner Manager */}
        </div>

        {/* Pulsanti */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
          <button
            onClick={generaPdfPreview}
            className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-full"
          >
            Genera anteprima PDF
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

export default CompilerAdesione;
