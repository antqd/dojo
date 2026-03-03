const REPORT_API_URL =
  process.env.COMPARISON_REPORT_API_URL ||
  "https://api.davveroo.it/api/email/attivazione";

const SENDER_NAME = process.env.COMPARISON_REPORT_SENDER_NAME || "Comparazione AI";

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildMessage(reportText, schema = {}) {
  return [
    "Report Comparazione Estratto Conto",
    "",
    `Transato: ${schema.transato || "-"}`,
    `Commissioni attuali: ${schema.commissioniAttuali || "-"}`,
    `Media attuale: ${schema.mediaAttuale || "-"}`,
    "",
    `Commissioni con nuove tariffe: ${schema.commissioniNuoveTariffe || "-"}`,
    `Nuova media: ${schema.nuovaMedia || "-"}`,
    "",
    `Risparmio mensile: ${schema.risparmioMensile || "-"}`,
    `Risparmio annuale: ${schema.risparmioAnnuale || "-"}`,
    "",
    "Output AI originale:",
    reportText || "-",
  ].join("\n");
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const { recipients = [], reportText = "", schema = {} } = req.body || {};

    const uniqueRecipients = [...new Set((recipients || []).map((r) => String(r || "").trim().toLowerCase()))].filter(Boolean);

    if (!uniqueRecipients.length) {
      return jsonResponse(400, { error: "Nessun destinatario fornito." });
    }

    const invalid = uniqueRecipients.filter((email) => !isValidEmail(email));
    if (invalid.length) {
      return jsonResponse(400, {
        error: `Email non valide: ${invalid.join(", ")}`,
      });
    }

    if (!reportText?.trim()) {
      return jsonResponse(400, { error: "Report vuoto." });
    }

    const message = buildMessage(reportText, schema);

    const results = await Promise.all(
      uniqueRecipients.map(async (recipient) => {
        const payload = {
          nome: SENDER_NAME,
          email: "",
          telefono: "",
          email_pmanager: "",
          messaggio: message,
          to: recipient,
          subject: "Report comparazione estratto conto",
          attachments: [],
        };

        const response = await fetch(REPORT_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const bodyText = await response.text();

        return {
          recipient,
          ok: response.ok,
          status: response.status,
          error: response.ok ? null : bodyText || "Errore invio",
        };
      })
    );

    const failed = results.filter((r) => !r.ok);

    if (failed.length) {
      return jsonResponse(207, {
        sent: results.length - failed.length,
        failed,
      });
    }

    return jsonResponse(200, {
      sent: results.length,
      failed: [],
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error?.message || "Errore interno durante invio report.",
    });
  }
}
