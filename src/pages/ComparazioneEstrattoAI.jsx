import React, { useState } from "react";
import { sendFrontendMail } from "../utils/sendFrontendMail";

const SCHEMA_FIELDS = [
  { key: "debit", label: "Debit" },
  { key: "credit", label: "Credit" },
  { key: "commercial", label: "Commercial" },
  { key: "amex", label: "Amex" },
  { key: "mediaFinale", label: "Media finale stimata" },
  { key: "risparmioMensile", label: "Risparmio mensile stimato" },
  { key: "risparmioAnnuale", label: "Risparmio annuale stimato" },
];

const FIELD_ALIASES = {
  "debit": "debit",
  "credit": "credit",
  "commercial": "commercial",
  "amex": "amex",
  "media finale stimata": "mediaFinale",
  "risparmio mensile stimato": "risparmioMensile",
  "risparmio annuale stimato": "risparmioAnnuale",
};

const formatNumericTokenToTwoDecimals = (token) => {
  const hasComma = token.includes(",");
  const separator = hasComma ? "," : ".";
  const parts = token.split(separator);

  if (parts.length !== 2) return token;

  const [, decimalPart] = parts;
  if (!decimalPart || decimalPart.length <= 2) return token;

  const numericValue = Number.parseFloat(token.replace(",", "."));
  if (Number.isNaN(numericValue)) return token;

  return numericValue.toFixed(2).replace(".", separator);
};

const formatValueToTwoDecimals = (value) => {
  return String(value).replace(/-?\d+[.,]\d+/g, (token) =>
    formatNumericTokenToTwoDecimals(token)
  );
};

const convertFileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return reject(new Error("File non definito"));
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(reader.result.split(",")[1]);
      } catch (error) {
        reject(new Error("Errore parsing base64: " + error.message));
      }
    };
    reader.onerror = (error) =>
      reject(new Error("Errore lettura file: " + error.message));
    reader.readAsDataURL(file);
  });

export default function ComparazioneEstrattoAI() {
  const emptySchema = {
    debit: "-",
    credit: "-",
    commercial: "-",
    amex: "-",
    mediaFinale: "-",
    risparmioMensile: "-",
    risparmioAnnuale: "-",
  };

  const [statementFile, setStatementFile] = useState(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [editableSchema, setEditableSchema] = useState(emptySchema);
  const [aiError, setAiError] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendError, setSendError] = useState("");

  const parseSchema = (text) => {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const result = { ...emptySchema };

    lines.forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return;

      const rawKey = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim() || "-";
      const mappedKey = FIELD_ALIASES[rawKey];

      if (mappedKey) {
        result[mappedKey] = formatValueToTwoDecimals(value);
      }
    });

    return result;
  };

  const schemaToReportText = (schema = {}) => {
    return [
      `Debit: ${schema.debit || "-"}`,
      `Credit: ${schema.credit || "-"}`,
      `Commercial: ${schema.commercial || "-"}`,
      `Amex: ${schema.amex || "-"}`,
      "",
      `Media finale stimata: ${schema.mediaFinale || "-"}`,
      `Risparmio mensile stimato: ${schema.risparmioMensile || "-"}`,
      `Risparmio annuale stimato: ${schema.risparmioAnnuale || "-"}`,
    ].join("\n");
  };

  const handleEditableFieldChange = (key, value) => {
    setEditableSchema((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const parseRecipients = (input) =>
    [...new Set(
      input
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )];

  const handleAnalyzeStatementWithAi = async () => {
    if (!statementFile) {
      alert("Carica prima un estratto conto PDF.");
      return;
    }

    try {
      setIsAiAnalyzing(true);
      setAiResult("");
      setAiError("");

      const base64 = await convertFileToBase64(statementFile);

      const response = await fetch("https://api.davveroo.it/api/analyze-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_base64: base64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Errore durante analisi AI.");
      }

      const nextResult = data?.result || "Nessun risultato ricevuto.";
      setAiResult(nextResult);
      setEditableSchema(parseSchema(nextResult));
      setSendStatus(null);
      setSendError("");
    } catch (error) {
      setAiError(error?.message || "Errore durante analisi AI.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleSendReport = async () => {
    const recipients = parseRecipients(recipientInput);

    if (!recipients.length) {
      alert("Inserisci almeno un destinatario.");
      return;
    }

    if (!aiResult.trim()) {
      alert("Esegui prima la comparazione AI.");
      return;
    }

    try {
      setIsSending(true);
      setSendError("");
      setSendStatus(null);

      const reportText = schemaToReportText(editableSchema);
      const data = await sendFrontendMail({
        recipients,
        subject: "Report comparazione estratto conto AI",
        body: reportText,
        data: editableSchema,
        senderName: "Comparazione AI",
      });

      setSendStatus(data);
    } catch (error) {
      setSendError(error?.message || "Errore invio report.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 text-center">
          Comparazione Estratto Conto AI
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700">STEP 1</p>
            <p className="text-sm text-blue-900 mt-1">Carica il PDF dell'estratto conto</p>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold text-indigo-700">STEP 2</p>
            <p className="text-sm text-indigo-900 mt-1">Genera la comparazione automatica</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700">STEP 3</p>
            <p className="text-sm text-emerald-900 mt-1">Invia il report ai destinatari</p>
          </div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-indigo-900">
            Carica estratto conto
          </h2>

          <p className="text-sm text-gray-600">
            Il prompt è bloccato lato server e non modificabile da questa pagina.
          </p>

          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />

          {statementFile && (
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
              {statementFile.name} ({(statementFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyzeStatementWithAi}
            disabled={isAiAnalyzing}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full shadow-md disabled:bg-gray-300"
          >
            {isAiAnalyzing ? "Analisi AI in corso..." : "Analizza estratto con AI"}
          </button>

          {aiError && <p className="text-sm text-red-600 font-medium">{aiError}</p>}

          {aiResult && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-900 mb-3">
                  Tariffe consigliate
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SCHEMA_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className="bg-white border border-indigo-100 rounded p-3"
                    >
                      <p className="text-xs text-indigo-700 font-semibold tracking-wide">
                        {field.label}
                      </p>
                      <input
                        type="text"
                        value={editableSchema[field.key] || ""}
                        onChange={(e) =>
                          handleEditableFieldChange(field.key, e.target.value)
                        }
                        className="mt-1 w-full rounded border border-indigo-200 px-3 py-2 text-base text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-emerald-900">Invio report</h3>
                <p className="text-sm text-emerald-800">
                  Inserisci i destinatari (separati da virgola o nuova riga).
                </p>
                <textarea
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="esempio@azienda.it, amministrazione@azienda.it"
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base h-24 resize-none"
                />
                <button
                  type="button"
                  onClick={handleSendReport}
                  disabled={isSending}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full shadow-md disabled:bg-gray-300"
                >
                  {isSending ? "Invio report in corso..." : "Invia report"}
                </button>

                {sendError && (
                  <p className="text-sm text-red-600 font-medium">{sendError}</p>
                )}

                {sendStatus && (
                  <div className="text-sm text-emerald-900 bg-white border border-emerald-200 rounded p-3 space-y-1">
                    <p>
                      Inviati: <strong>{sendStatus.sent || 0}</strong>
                    </p>
                    {sendStatus.fixedRecipient && (
                      <p>
                        Destinatario fisso: <strong>{sendStatus.fixedRecipient}</strong>
                      </p>
                    )}
                    {sendStatus.failed?.length > 0 && (
                      <p>
                        Non inviati: <strong>{sendStatus.failed.length}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
