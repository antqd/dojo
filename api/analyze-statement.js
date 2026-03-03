const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyA94jn-iKSNccnemD4Mfue9tz1rD-KTGyE";
const GEMINI_MODEL = "gemini-1.5-pro";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const DEFAULT_BANK_STATEMENT_PROMPT = `Analizza esclusivamente il PDF dell'estratto conto che ti viene fornito.

Estrai:

Transato totale mensile

Commissioni totali

Media percentuale attuale (Commissioni / Transato)

Applica SOLO queste tariffe:

Debit -> 0,55 %

Credit -> 0,65 %

Commercial -> 1,20 %

Extra EU -> 0,30 %

Amex -> 1,90 %

Europee -> 0 %

DCC -> 1 % cashback

TARGET: battere lo 0,75 % medio attuale
Obiettivo reale: arrivare a 0,65 % medio.

Calcola:

Nuove commissioni totali applicando le tariffe sopra al transato reale dell'estratto conto

Nuova media percentuale

Risparmio mensile = Commissioni attuali - Commissioni simulate

Risparmio annuale = Risparmio mensile x 12

Output richiesto (senza testo extra):

Transato:
Commissioni attuali:
Media attuale:

Commissioni con nuove tariffe:
Nuova media:

Risparmio mensile:
Risparmio annuale:

Formatta i numeri con massimo 2 cifre decimali (esempio: 0,65).

Non inserire spiegazioni, solo numeri e risultati.`;

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export default async function handler(req, res) {
  // Dev mode: usa res.status() invece di jsonResponse
  const isDev = process.env.NODE_ENV === "development";
  const sendResponse = (status, body) => {
    if (isDev && res) {
      res.status(status).json(body);
    } else {
      return {
        statusCode: status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      };
    }
  };

  if (req.method !== "POST") {
    return sendResponse(405, { error: "Method not allowed" });
  }

  if (!GEMINI_API_KEY) {
    return sendResponse(500, {
      error: "GEMINI_API_KEY non configurata nel server.",
    });
  }

  try {
    const {
      base64,
      mimeType = "application/pdf",
      filename = "estratto-conto.pdf",
    } = req.body || {};

    if (!base64) {
      return sendResponse(400, { error: "File mancante." });
    }

    const systemPrompt =
      process.env.GEMINI_BANK_STATEMENT_SYSTEM_PROMPT ||
      DEFAULT_BANK_STATEMENT_PROMPT;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: systemPrompt,
            },
            {
              text: "Analizza il file allegato e rispondi solo con il formato richiesto.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1400,
      },
    };

    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

    console.log("[Gemini] Sending request to:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("[Gemini] Response status:", response.status);
    console.log("[Gemini] Response data:", JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      console.error("[Gemini] Error:", data);
      return sendResponse(response.status, {
        error: data?.error?.message || "Errore API Gemini",
      });
    }

    const resultText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Nessun risultato disponibile";

    console.log("[Gemini] Result:", resultText.substring(0, 200));

    return sendResponse(200, { result: resultText });
  } catch (error) {
    console.error("[Gemini] Exception:", error);
    return sendResponse(500, {
      error: error?.message || "Errore interno durante analisi AI.",
    });
  }
}
