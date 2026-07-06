import React, { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

const SOFTPOS_PROFILES = [
  {
    id: "gold",
    field: "softposGold",
    label: "GOLD",
    minimumPayout: "Erogato minimo 4.000 euro",
  },
  {
    id: "platinum",
    field: "softposPlatinum",
    label: "PLATINUM",
    minimumPayout: "Erogato minimo 2.000 euro",
  },
  {
    id: "silver",
    field: "softposSilver",
    label: "SILVER",
    minimumPayout: "Erogato minimo 1.000 euro",
  },
  {
    id: "bronze",
    field: "softposBronze",
    label: "BRONZE",
    minimumPayout: "Erogato minimo 500 euro",
  },
];

const CANONE_OPTIONS = [
  {
    field: "canoneBasicAnnuale",
    label: "Canone annuale Basic",
    value: "99 euro oltre iva",
  },
  {
    field: "canonePlusAnnuale",
    label: "Canone annuale Plus",
    value: "149 euro oltre iva",
  },
  {
    field: "canoneBasicMensile",
    label: "Canone Mensile Basic",
    value: "10 euro oltre iva",
  },
  {
    field: "canonePlusMensile",
    label: "Canone Mensile Plus",
    value: "15 euro oltre iva",
  },
];

const CompilerAdesione = () => {
  // ======= Util =======
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
    canoneBasicMensile: false,
    canoneBasicAnnuale: false,
    canonePlusMensile: false,
    canonePlusAnnuale: false,
    softposGold: false,
    softposPlatinum: false,
    softposSilver: false,
    softposBronze: false,
    codiceScontoPrimoAnnoEnabled: false,
    codiceScontoPrimoAnno: "",

    // ✅ AGENTE (NUOVO)
    agenteNomeCognome: "",
    agenteMail: "",
    agenteCellulare: "",
    email_pmanager: "",

    // (mantengo anche i vecchi per compatibilità)
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
  const [pdfVersion, setPdfVersion] = useState(0);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yousignStatus, setYousignStatus] = useState(null);
  const [isStartingYousign, setIsStartingYousign] = useState(false);
  const [yousignResult, setYousignResult] = useState(null);

  const API_CLIENTE = "https://api.davveroo.it/api/email/attivazione";
  const API_YOUSIGN =
    import.meta.env.VITE_YOUSIGN_API_URL ||
    "https://api.davveroo.it/api/yousign-signature-request";

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

  const normalizePhoneForOtp = (phone) => {
    const compact = String(phone || "").replace(/[\s().-]/g, "");
    if (!compact) return "";
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("00")) return `+${compact.slice(2)}`;
    if (/^3\d{8,10}$/.test(compact)) return `+39${compact}`;
    return compact;
  };

  const isValidOtpPhone = (phone) => /^\+[1-9]\d{7,14}$/.test(phone);

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

  // Riepilogo prezzi per EMAIL (non per pagina 1 del PDF)
  const buildPrezziServiziText = () => {
    const lines = [];
    CANONE_OPTIONS.forEach(({ field, label, value }) => {
      if (formData[field] === true) lines.push(`${label}: ${value}`);
    });

    SOFTPOS_PROFILES.forEach((profile) => {
      if (formData[profile.field] !== true) return;
      lines.push(`SoftPOS ${profile.label}: ${profile.minimumPayout}`);
    });

    if (formData.codiceScontoPrimoAnnoEnabled === true) {
      lines.push(
        `Codice Sconto primo anno: ${
          formData.codiceScontoPrimoAnno || "non specificato"
        }`
      );
    }

    return lines.join("\n");
  };

  // ======= Generazione PDF =======
  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/moduloadesionepartner.pdf").then(
      (res) => res.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page2 = pages[1] || pages[0];
    const page3 = pages[2] || null;

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

    // === PAGINA 1 ===

    // Dati azienda (colonna sinistra)
    drawTextOn(page1, formData.ragioneSociale, 160, 740, 11);
    drawTextOn(page1, formData.partitaIva, 133, 721, 11);
    drawTextOn(page1, formData.codiceSdi, 122, 698, 11);
    drawTextOn(page1, formData.sedeCommerciale, 170, 680, 11);
    drawTextOn(page1, formData.citta, 105, 660, 11);
    drawTextOn(page1, formData.cellulareAzienda, 120, 645, 11);
    drawTextOn(page1, formData.settoreMerceologico, 200, 625, 11);

    // Dati azienda (colonna destra)
    drawTextOn(page1, formData.codiceFiscaleAzienda, 360, 727, 11);
    drawTextOn(page1, formData.pec, 360, 703, 11);
    drawTextOn(page1, formData.provincia, 365, 650, 11);
    drawTextOn(page1, formData.mailAzienda, 105, 607, 11);
    drawTextOn(page1, formData.iban, 105, 590, 11);

    // Legale rappresentante
    drawTextOn(page1, formData.legaleNomeCognome, 152, 530, 11);
    drawTextOn(page1, formData.legaleCodiceFiscale, 310, 530, 11);
    drawMultilineTextOn(page1, formData.legaleIndirizzo, 170, 511, {
      size: 11,
      maxWidth: 260,
      lineHeight: 13,
    });
    drawTextOn(page1, formData.legaleCellulare, 110, 492, 10);
    drawTextOn(page1, formData.legaleMail, 320, 488, 10);

    // ✅ DESCRIZIONE SERVIZIO: SOLO TESTO (NO PREZZI) in pagina 1
    drawMultilineTextOn(page1, formData.descrizioneServizio, 70, 275, {
      size: 11,
      maxWidth: 360,
      lineHeight: 13,
    });

    // ✅ AGENTE (stessa area “personale manager” che avevi)
    // Se compilato agente -> usa agente, altrimenti fallback ai vecchi personaleManager*
    const agenteNome =
      formData.agenteNomeCognome?.trim() ||
      formData.personaleManagerNome?.trim();
    const agenteMail =
      formData.agenteMail?.trim() || formData.personaleManagerMail?.trim();
    const agenteCell =
      formData.agenteCellulare?.trim() || formData.personaleManagerCell?.trim();

    // Coordinate: sono quelle che avevi già in basso (le ho mantenute)
    drawTextOn(page1, agenteNome, 140, 220, 9);
    drawTextOn(page1, agenteMail, 100, 205, 9);
    drawTextOn(page1, agenteCell, 110, 187, 9);

    // Note
    drawMultilineTextOn(page1, formData.note, 40, 110, {
      size: 11,
      maxWidth: 520,
      lineHeight: 13,
    });

    // === PAGINA 2 (data contratto) ===
    if (page2) {
      if (formData.dataContratto) {
        drawTextOn(page2, formData.dataContratto, 84, 120, 11);
      }
    }

    // === PAGINA 3 (X + prezzi SOLO QUI) ===
    if (page3) {
      if (formData.dataContratto) {
        drawTextOn(page3, formData.dataContratto, 84, 120, 11);
      }

      const page3CheckboxMap = [
        { field: "canoneBasicAnnuale", xCheck: 62, yCheck: 713 },
        { field: "canonePlusAnnuale", xCheck: 312, yCheck: 710 },
        { field: "canoneBasicMensile", xCheck: 62, yCheck: 590 },
        { field: "canonePlusMensile", xCheck: 312, yCheck: 590 },
        { field: "softposGold", xCheck: 50, yCheck: 307 },
        { field: "softposPlatinum", xCheck: 190, yCheck: 307 },
        { field: "softposSilver", xCheck: 335, yCheck: 307 },
        { field: "softposBronze", xCheck: 468, yCheck: 307 },
      ];

      page3CheckboxMap.forEach(({ field, xCheck, yCheck }) => {
        if (formData[field] === true)
          drawTextOn(page3, "X", xCheck, yCheck, 13, fontBold);
      });

      if (formData.codiceScontoPrimoAnnoEnabled === true) {
        drawTextOn(page3, "X", 62, 530, 13, fontBold);
        drawTextOn(
          page3,
          formData.codiceScontoPrimoAnno || "",
          352,
          530,
          10,
          font
        );
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(url);
    setPdfVersion((version) => version + 1);
  };

  const scaricaPdf = () =>
    pdfUrl && saveAs(pdfUrl, "modulo_adesione_expopay.pdf");

  // ======= Invio backoffice =======
  const getFileSize = (f) => f?.size ?? 0;
  const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

  async function handleSubmitToClient() {
    if (!pdfUrl) return alert("Genera prima il PDF.");

    const destinatario =
      formData.agenteMail?.trim() ||
      formData.personaleManagerMail?.trim() ||
      formData.mailAzienda?.trim();

    if (!destinatario) {
      alert(
        "Inserisci almeno una mail destinataria (mail azienda o mail AGENTE) prima di inviare."
      );
      return;
    }

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
        nome: formData.ragioneSociale?.trim() || "Senza nome",
        email: formData.mailAzienda?.trim() || "",
        telefono: formData.cellulareAzienda?.trim() || "",
        email_pmanager: formData.email_pmanager?.trim() || "",
        messaggio:
          (formData.note ||
            `Modulo di adesione Davveroo - servizio: ${
              formData.descrizioneServizio || ""
            }`) + prezziTextForEmail,
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

  async function handleStartYousignSignature() {
    if (!pdfUrl) return alert("Genera prima il PDF.");

    const signerEmail =
      formData.legaleMail?.trim() || formData.mailAzienda?.trim();
    const signerPhoneNumber = normalizePhoneForOtp(formData.legaleCellulare);

    if (!formData.legaleNomeCognome?.trim()) {
      alert("Inserisci nome e cognome del legale rappresentante.");
      return;
    }

    if (!signerEmail) {
      alert("Inserisci la mail del legale rappresentante o la mail azienda.");
      return;
    }

    if (!isValidOtpPhone(signerPhoneNumber)) {
      alert(
        "Inserisci il cellulare del legale rappresentante in formato internazionale, ad esempio +393272485716."
      );
      return;
    }

    setYousignStatus(null);
    setYousignResult(null);
    setIsStartingYousign(true);

    try {
      const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
      const pdfFile = new File([pdfBlob], "modulo_adesione_expopay.pdf", {
        type: "application/pdf",
      });

      const payload = {
        document: {
          filename: pdfFile.name,
          mimeType: pdfFile.type,
          base64: await convertFileToBase64(pdfFile),
        },
        signer: {
          fullName: formData.legaleNomeCognome.trim(),
          email: signerEmail,
          phoneNumber: signerPhoneNumber,
          locale: "it",
        },
        signatureRequest: {
          name: `Modulo adesione Davveroo - ${
            formData.ragioneSociale?.trim() || "cliente"
          }`,
          externalId: formData.partitaIva?.trim() || undefined,
          deliveryMode: "email",
        },
        metadata: {
          ragioneSociale: formData.ragioneSociale?.trim() || "",
          partitaIva: formData.partitaIva?.trim() || "",
          agenteMail: formData.agenteMail?.trim() || "",
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
        throw new Error(data?.error ? `${data.error}${details}` : `HTTP ${res.status}`);
      }

      setYousignResult(data);
      setYousignStatus("success");
      alert("Richiesta di firma digitale Yousign avviata.");
    } catch (err) {
      console.error(err);
      setYousignStatus("error");
      alert(`Errore Yousign: ${err.message}`);
    } finally {
      setIsStartingYousign(false);
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
              type="tel"
              name="legaleCellulare"
              placeholder="Cellulare OTP es. +393272485716"
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
              Seleziona i canoni da riportare nella terza pagina
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CANONE_OPTIONS.map(({ field, label, value }) => (
                <label
                  key={field}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm sm:text-base ${
                    formData[field] === true
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[field]}
                    onChange={handleCheckboxChange(field)}
                    className="mt-1"
                  />
                  <span className="flex flex-col">
                    <span className="font-semibold text-gray-900">{label}</span>
                    <span className="text-sm text-gray-700">{value}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-800">
              Profilo SoftPOS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SOFTPOS_PROFILES.map((profile) => (
                <label
                  key={profile.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3 text-sm ${
                    formData[profile.field] === true
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      checked={formData[profile.field]}
                      onChange={handleCheckboxChange(profile.field)}
                    />
                    {profile.label}
                  </span>
                  <span className="text-sm text-gray-700">
                    {profile.minimumPayout}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <label
              className={`flex items-center gap-3 text-sm sm:text-base ${
                formData.codiceScontoPrimoAnnoEnabled === true
                  ? "text-blue-900"
                  : "text-gray-900"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.codiceScontoPrimoAnnoEnabled}
                onChange={handleCheckboxChange("codiceScontoPrimoAnnoEnabled")}
              />
              <span className="font-semibold">Codice Sconto primo anno</span>
            </label>

            {formData.codiceScontoPrimoAnnoEnabled === true && (
              <input
                name="codiceScontoPrimoAnno"
                placeholder="Inserisci codice sconto primo anno"
                value={formData.codiceScontoPrimoAnno}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            )}
          </div>

          <textarea
            name="descrizioneServizio"
            placeholder="Descrizione servizio (verrà inserita nell'area 'DESCRIZIONE SERVIZIO' del modulo)"
            value={formData.descrizioneServizio}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base h-24 resize-none"
          />
        </div>

        {/* ✅ AGENTE (NUOVA SEZIONE UI) */}
        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Agente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <input
              name="agenteNomeCognome"
              placeholder="Nome e cognome"
              value={formData.agenteNomeCognome}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="agenteMail"
              placeholder="Mail"
              value={formData.agenteMail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="agenteCellulare"
              placeholder="Cellulare"
              value={formData.agenteCellulare}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <input
              name="email_pmanager"
              placeholder="Email P. Manager (endpoint)"
              value={formData.email_pmanager}
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
          <button
            type="button"
            onClick={handleStartYousignSignature}
            disabled={isStartingYousign || !pdfUrl}
            className={`w-full sm:w-auto ${
              pdfUrl
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-gray-300 cursor-not-allowed"
            } text-white font-semibold px-6 py-3 rounded-full shadow-md`}
          >
            {isStartingYousign
              ? "Avvio firma..."
              : "Avvia firma digitale Yousign"}
          </button>
        </div>

        {(yousignStatus || yousignResult) && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              yousignStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {yousignStatus === "success" ? (
              <div className="space-y-2">
                <p className="font-semibold">
                  Richiesta Yousign creata correttamente.
                </p>
                <p>
                  Yousign inviera la mail al firmatario per completare firma e
                  OTP.
                </p>
              </div>
            ) : (
              <p className="font-semibold">
                Impossibile avviare la richiesta Yousign.
              </p>
            )}
          </div>
        )}

        {submitStatus && (
          <div
            className={`rounded-lg border p-4 text-sm font-semibold ${
              submitStatus === "success"
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {submitStatus === "success"
              ? "Modulo inviato correttamente al backoffice."
              : "Invio al backoffice non riuscito."}
          </div>
        )}

        {/* Anteprima PDF */}
        {pdfUrl && (
          <div className="pt-6">
            <h3 className="text-lg sm:text-xl font-semibold text-center text-blue-900 mb-4">
              Anteprima:
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={`${pdfUrl}#v=${pdfVersion}`}
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
