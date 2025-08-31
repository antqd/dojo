import React, { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import SignatureCanvas from "react-signature-canvas";

const CompilerDojo = () => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cell: "",
    ragione: "",
    iva: "",
    indirizzo: "",
    transato: "",
    altriPos: "",
    debito: "",
    credito: "",
    business: "",
    offdebito: "",
    offcredito: "",
    offbusiness: "",
    posname: "",
    marchio: "",
    info: "",
  });

  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stati per controllare l'attivazione delle firme
  const [isSignature1Active, setIsSignature1Active] = useState(false);
  const [isSignature2Active, setIsSignature2Active] = useState(false);

  const sigCanvasRef = useRef();
  const sigCanvasRef2 = useRef();

  const API_CLIENTE = "https://emailsender-68kp.onrender.com/api/sendToClient"; // NUOVO endpoint


  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("File non definito"));
        return;
      }

      // Verifica che il file sia un'istanza di File o Blob
      if (!(file instanceof File) && !(file instanceof Blob)) {
        reject(new Error("Il parametro non è un file valido"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (!reader.result) {
          reject(new Error("Risultato del file null"));
          return;
        }

        try {
          const base64Only = reader.result.split(",")[1];
          resolve(base64Only);
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

  const clearFirma = () => {
    sigCanvasRef.current?.clear();
  };

  const clearFirma2 = () => {
    sigCanvasRef2.current?.clear();
  };

  // Funzioni per attivare/disattivare le firme
  const toggleSignature1 = () => {
    setIsSignature1Active(!isSignature1Active);
  };

  const toggleSignature2 = () => {
    setIsSignature2Active(!isSignature2Active);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event, sectionName) => {
    const selectedFiles = Array.from(event.target.files);

    selectedFiles.forEach((file) => {
      Object.defineProperty(file, "section", {
        value: sectionName,
        enumerable: true,
      });

      setFiles((prevFiles) => [...prevFiles, file]);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews((prevPreviews) => [
            ...prevPreviews,
            {
              src: e.target.result,
              section: sectionName,
              name: file.name,
              type: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prevPreviews) => [
          ...prevPreviews,
          {
            src: null,
            section: sectionName,
            name: file.name,
            type: file.type,
          },
        ]);
      }
    });
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setFilePreviews((prevPreviews) =>
      prevPreviews.filter((_, i) => i !== index)
    );
  };

  const getFilesBySection = (sectionName) => {
    return filePreviews.filter((preview) => preview.section === sectionName);
  };

  const generaPdfPreview = async () => {
    const existingPdfBytes = await fetch("/modello.pdf").then((res) =>
      res.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const page3 = pages[2];

    const drawText = (text, x, y, size = 12) => {
      page3.drawText(text || "", {
        x,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    drawText(formData.nome, 280, 518, 14);
    drawText(formData.iva, 77, 503, 14);
    drawText(formData.ragione, 77, 518, 14);
    drawText(formData.cell, 77, 470, 12);
    drawText(formData.email, 77, 488, 9);
    drawText(formData.indirizzo, 247, 490, 13);
    drawText(formData.debito, 137, 407, 9);
    drawText(formData.offdebito, 263, 407, 9);
    drawText(formData.credito, 137, 393, 9);
    drawText(formData.offcredito, 263, 393, 9);
    drawText(formData.business, 137, 379, 9);
    drawText(formData.offbusiness, 263, 379, 9);
    drawText(formData.posname, 124, 245, 12);
    drawText(formData.marchio, 124, 225, 12);
    drawText(formData.info, 30, 176, 10);

    if (formData.transato === "yes") drawText("X", 44, 438, 10);
    if (formData.transato === "no") drawText("X", 77, 438, 10);
    if (formData.altriPos === "yes") drawText("X", 213, 438, 10);
    if (formData.altriPos === "no") drawText("X", 246, 438, 10);

    const firmaDataUrl = getFirmaImage();
    if (firmaDataUrl) {
      const firmaImageBytes = await fetch(firmaDataUrl).then((res) =>
        res.arrayBuffer()
      );
      const firmaImage = await pdfDoc.embedPng(firmaImageBytes);
      page3.drawImage(firmaImage, {
        x: 280,
        y: 50,
        width: 120,
        height: 30,
      });
    }

    const firmaDataUrl2 = sigCanvasRef2.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");

    if (firmaDataUrl2) {
      const firmaImageBytes2 = await fetch(firmaDataUrl2).then((res) =>
        res.arrayBuffer()
      );
      const firmaImage2 = await pdfDoc.embedPng(firmaImageBytes2);
      page3.drawImage(firmaImage2, {
        x: 20,
        y: 50,
        width: 120,
        height: 30,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const scaricaPdf = () => {
    if (!pdfUrl) return;
    saveAs(pdfUrl, "modulo_compilato.pdf");
  };

const handleSubmitToClient = async () => {
  if (!pdfUrl) return alert("Genera prima il PDF.");
  setSubmitStatus(null);
  setIsSubmitting(true);

  try {
    // prendo il PDF generato e lo allego assieme ai file caricati
    const pdfBlob = await fetch(pdfUrl).then((res) => res.blob());
    const pdfFile = new File([pdfBlob], "modulo.pdf", { type: "application/pdf" });
    const allegati = [pdfFile, ...files];

    // converto in base64 (riuso la tua convertFileToBase64)
    const encodedAttachments = await Promise.all(
      allegati.map(async (file) => ({
        filename: file.name,
        base64: await convertFileToBase64(file),
      }))
    );

    // chiamata al NUOVO endpoint: invia agli interni del flusso "cliente" + ricevuta al candidato
    const res = await fetch(API_CLIENTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: formData.nome,
        email: formData.email,     // <- il cliente riceverà la conferma qui
        telefono: formData.cell,
        messaggio: formData.info,
        allegati: encodedAttachments, // opzionale: togli se non vuoi inoltrare allegati
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Errore invio: ${res.status} - ${txt}`);
    }

    setSubmitStatus("success");
    alert("Email al cliente inviata correttamente.");
  } catch (err) {
    console.error("Errore invio cliente:", err);
    setSubmitStatus("error");
    alert(`Errore durante l'invio al cliente: ${err.message}`);
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 text-center">
          Compilazione modulo PDF
        </h2>

        {/* Sezione dati principali */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            name="nome"
            placeholder="Nome e Cognome"
            value={formData.nome}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="ragione"
            placeholder="Ragione Sociale"
            value={formData.ragione}
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
            name="cell"
            placeholder="Cellulare"
            value={formData.cell}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <input
            name="iva"
            placeholder="Partita IVA"
            value={formData.iva}
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

        {/* Sezione condizioni e offerte */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Condizioni attuali e Offerte
          </h3>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm sm:text-base">
                Condizioni attuali:
              </h4>
              <input
                name="debito"
                placeholder="Carte di debito CNS"
                value={formData.debito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <input
                name="credito"
                placeholder="Carte di credito CNS"
                value={formData.credito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <input
                name="business"
                placeholder="Carte business"
                value={formData.business}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm sm:text-base">
                Nuove offerte:
              </h4>
              <input
                name="offdebito"
                placeholder="Offerta carta di debito"
                value={formData.offdebito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <input
                name="offcredito"
                placeholder="Offerta carta di credito"
                value={formData.offcredito}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <input
                name="offbusiness"
                placeholder="Offerta carta business"
                value={formData.offbusiness}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Sezione note */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-blue-900">
            Note
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              name="posname"
              placeholder="Nome POS"
              value={formData.posname}
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
          </div>

          <textarea
            name="info"
            placeholder="Transato mensile inferiore a 5000€"
            value={formData.info}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base h-20 sm:h-24 resize-none"
          />
        </div>

        {/* Radio buttons */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-900 mb-3 text-sm sm:text-base">
              Livello transato mensile &gt; 5000€?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transato"
                  value="yes"
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm sm:text-base">Sì</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transato"
                  value="no"
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm sm:text-base">No</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-900 mb-3 text-sm sm:text-base">
              Hai altri POS?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="altriPos"
                  value="yes"
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm sm:text-base">Sì</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="altriPos"
                  value="no"
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm sm:text-base">No</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sezione Upload Documenti */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 text-center">
            Caricamento Documenti
          </h2>

          {/* Sezione 1 - Visura Camerale */}
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

          {/* Sezione 2 - Documenti Identità e Codice Fiscale */}
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

          {/* Sezione 3 - Documento IBAN */}
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

          {/* Riepilogo tutti i file */}
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

        {/* Sezione Firme con controlli di attivazione */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-6">
          {/* Prima firma */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold text-sm sm:text-base">
                Firma del richiedente
              </p>
              <button
                onClick={toggleSignature1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isSignature1Active
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
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
                  <span className="text-2xl block mb-2">🔒</span>
                  {sigCanvasRef.current && !sigCanvasRef.current.isEmpty()
                    ? "Firma salvata - Clicca 'Attiva Firma' per modificare"
                    : "Clicca su 'Attiva Firma' per firmare"}
                </p>
              </div>
            )}

            {isSignature1Active && (
              <button
                onClick={clearFirma}
                type="button"
                className="mt-2 text-sm text-blue-700 underline hover:text-blue-900 transition-colors"
              >
                Cancella firma
              </button>
            )}
          </div>

          {/* Seconda firma */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <p className="text-blue-900 font-semibold text-sm sm:text-base">
                Firma Partner Manager
              </p>
              <button
                onClick={toggleSignature2}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isSignature2Active
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
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
                  <span className="text-2xl block mb-2">🔒</span>
                  {sigCanvasRef2.current && !sigCanvasRef2.current.isEmpty()
                    ? "Firma salvata - Clicca 'Attiva Firma' per modificare"
                    : "Clicca su 'Attiva Firma' per firmare"}
                </p>
              </div>
            )}

            {isSignature2Active && (
              <button
                onClick={clearFirma2}
                type="button"
                className="mt-2 text-sm text-blue-700 underline hover:text-blue-900 transition-colors"
              >
                Cancella firma
              </button>
            )}
          </div>
        </div>

        {/* Pulsanti azione */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4">
          <button
            onClick={generaPdfPreview}
            className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-full transition-colors duration-200 text-sm sm:text-base"
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
            } text-black font-semibold px-6 py-3 rounded-full transition-colors duration-200 text-sm sm:text-base`}
          >
            Scarica PDF
          </button>
          <button
            type="button"
            onClick={handleSubmitToClient}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-md transition duration-200 transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? "Invio in corso..." : "Invia a Backoffice"}
          </button>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="text-blue-800 underline hover:text-blue-600 text-sm transition-colors duration-200"
          >
            Torna alla Home
          </a>
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
