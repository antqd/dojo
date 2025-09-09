// PATCH principali:
// - aggiunti campi: canone, canonedojo, transatoCredito, transatoDebito, scontrinoMedio, scontrinoMassimo
// - rimossi input non usati da drawText: iva, posname
// - aggiunti drawText per i nuovi campi (coordinate stimate, vedi commenti TODO se serve fino)
import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const CompilerDojo = () => {
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

  const API_CLIENTE = "https://emailsender-68kp.onrender.com/api/sendToClient";

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

  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/modello1.pdf").then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];

    const drawText = (text, x, y, size = 12) => {
      page.drawText(String(text || ""), {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // già presenti
    drawText(formData.partnermanager, 555, 1045, 21);
    drawText(formData.ragione, 230, 1202, 20);
    drawText(formData.cell, 160, 1095, 20);
    drawText(formData.email, 500, 1095, 20);
    drawText(formData.iban, 120, 1045, 17);
    page.drawText(formData.indirizzo || "", {
      x: 350,
      y: 1170,
      size: 15,
      font,
      color: rgb(0, 0, 0),
      maxWidth: 300,
      lineHeight: 18,
    });
    // drawText(formData.indirizzo, 350, 1170, 16);
    drawText(formData.debito, 200, 855, 19);
    drawText(formData.offdebito, 570, 855, 19);
    drawText(formData.credito, 200, 895, 19);
    drawText(formData.offcredito, 570, 895, 19);
    drawText(formData.business, 200, 813, 19);
    drawText(formData.offbusiness, 570, 813, 19);
    drawText(formData.marchio, 220, 1135, 20);
    page.drawText(formData.info || "", {
      x: 107,
      y: 380,
      size: 18,
      font,
      color: rgb(0, 0, 0),
      maxWidth: 590,
      lineHeight: 18,
    });

    // NUOVI CAMPI (coordinate stimate in base al layout dell'immagine)
    // Canone mensile (colonna sinistra) e Canone mensile Dojo (colonna destra)
    drawText(formData.canone, 200, 765, 18); // TODO: se serve micro-ajust
    drawText(formData.canonedojo, 510, 765, 18); // TODO: regola x/y se necessario

    // Transato mese credito/debito (sinistra) — Scontrino medio/massimo (destra)
    drawText(formData.transatoCredito, 250, 710, 18);
    drawText(formData.transatoDebito, 250, 675, 18);
    drawText(formData.scontrinoMedio, 570, 710, 18);
    drawText(formData.scontrinoMassimo, 580, 675, 18);

    // firme
    const firma1 = getFirmaImage();
    if (firma1) {
      const bytes = await fetch(firma1).then((r) => r.arrayBuffer());
      const png = await pdfDoc.embedPng(bytes);
      page.drawImage(png, { x: 85, y: 105, width: 150, height: 50 });
    }
    const firma2 = sigCanvasRef2.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    if (firma2) {
      const bytes2 = await fetch(firma2).then((r) => r.arrayBuffer());
      const png2 = await pdfDoc.embedPng(bytes2);
      page.drawImage(png2, { x: 485, y: 105, width: 150, height: 50 });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const scaricaPdf = () => pdfUrl && saveAs(pdfUrl, "modulo_compilato.pdf");

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
        attachments, // backend /api/sendToClient si aspetta questo nome
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 text-center">
          Compilazione modulo PDF
        </h2>

        {/* Dati principali (come nel modello) */}
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

          {/* Riga: Canone mensile / Canone mensile Dojo */}
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

          {/* Righe: Transato / Scontrino */}
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

        {/* Upload documenti (come avevi) */}
        {/* ... (resto identico al tuo codice per upload/preview/riepilogo) ... */}

        {/* Firme / Azioni / Anteprima — identici al tuo file, non ripetuti per brevità */}
        {/* Sostituisci i blocchi sottostanti con gli stessi che hai già nel file originale */}
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
                {isSignature1Active ? "🔓 Disattiva Firma" : "🔒 Attiva Firma"}
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
                {isSignature2Active ? "🔓 Disattiva Firma" : "🔒 Attiva Firma"}
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
