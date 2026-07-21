import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import process from "node:process";

const DEFAULT_YOUSIGN_BASE_URL = "https://api-sandbox.yousign.app/v3";
const DEFAULT_CONTRACTS_EMAIL = "contratti@davveroo.it";
const DEFAULT_EMAIL_ENDPOINT = "https://api.davveroo.it/api/email/attivazione";
const COMPLETED_EVENTS = new Set([
  "signature_request.done",
  "signature_request.completed",
]);

function sendResponse(req, res, status, body) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Yousign-Signature-256, X-Yousign-Retry, X-Yousign-Issued-At",
  };

  if (process.env.NODE_ENV === "development" && res) {
    res.status(status).set(headers).json(body);
    return null;
  }

  return {
    statusCode: status,
    headers,
    body: JSON.stringify(body),
  };
}

function getHeader(req, name) {
  const wanted = name.toLowerCase();
  const headers = req.headers || {};
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  const value = key ? headers[key] : null;
  return Array.isArray(value) ? value[0] : value;
}

async function getRawBody(req) {
  if (req.rawBody) return String(req.rawBody);
  if (typeof req.body === "string") return req.body;
  if (req.body) return JSON.stringify(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function verifyWebhookSignature(req, rawBody) {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET;
  if (!secret) return;

  const received = getHeader(req, "x-yousign-signature-256");
  if (!received) {
    const error = new Error("Firma webhook Yousign mancante.");
    error.status = 401;
    throw error;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const expected = `sha256=${digest}`;
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    const error = new Error("Firma webhook Yousign non valida.");
    error.status = 401;
    throw error;
  }
}

function formatYousignError(data) {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  if (Array.isArray(data.violations)) {
    return data.violations
      .map((item) => `${item.propertyPath || "field"}: ${item.message}`)
      .join("; ");
  }
  return JSON.stringify(data);
}

async function yousignFetch(path, options = {}, step = path) {
  const apiKey = process.env.YOUSIGN_API_KEY;
  const baseUrl = (
    process.env.YOUSIGN_BASE_URL || DEFAULT_YOUSIGN_BASE_URL
  ).replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("YOUSIGN_API_KEY non configurata nel server.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  if (options.expectBinary) {
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const error = new Error(errorText || `Errore Yousign HTTP ${response.status}`);
      error.status = response.status;
      error.step = step;
      throw error;
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "application/pdf",
    };
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      formatYousignError(data) || `Errore Yousign HTTP ${response.status}`
    );
    error.status = response.status;
    error.step = step;
    error.upstreamBody = data;
    throw error;
  }

  return data;
}

function getSignatureRequestId(payload) {
  return (
    payload?.data?.signature_request?.id ||
    payload?.data?.id ||
    payload?.signature_request?.id ||
    payload?.signatureRequestId ||
    null
  );
}

function getDocumentFilename(document, index) {
  const base =
    document?.filename ||
    document?.name ||
    `documento-firmato-${index + 1}.pdf`;
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

async function downloadSignedDocuments(signatureRequestId) {
  const signatureRequest = await yousignFetch(
    `/signature_requests/${signatureRequestId}`,
    { method: "GET" },
    "fetch_signature_request"
  );

  const documents = (signatureRequest.documents || []).filter(
    (document) => document.nature !== "attachment"
  );

  if (documents.length === 0) {
    throw new Error("Nessun documento firmabile trovato nella richiesta Yousign.");
  }

  return Promise.all(
    documents.map(async (document, index) => {
      const downloaded = await yousignFetch(
        `/signature_requests/${signatureRequestId}/documents/${document.id}/download`,
        {
          method: "GET",
          headers: { Accept: "application/pdf" },
          expectBinary: true,
        },
        "download_signed_document"
      );

      return {
        filename: getDocumentFilename(document, index),
        base64: downloaded.buffer.toString("base64"),
        contentType: downloaded.contentType,
      };
    })
  );
}

async function sendSignedDocumentsToContracts(signatureRequestId, attachments) {
  const emailEndpoint =
    process.env.YOUSIGN_SIGNED_DOCUMENT_EMAIL_ENDPOINT || DEFAULT_EMAIL_ENDPOINT;
  const to = process.env.YOUSIGN_SIGNED_DOCUMENT_TO || DEFAULT_CONTRACTS_EMAIL;

  const response = await fetch(emailEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Yousign",
      email: to,
      telefono: "",
      to,
      subject: `Documento firmato Yousign - ${signatureRequestId}`,
      messaggio: `La richiesta Yousign ${signatureRequestId} e stata completata. In allegato trovi il documento firmato.`,
      attachments,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
      const error = new Error(
      `Errore invio contratti HTTP ${response.status} - ${text || "no body"}`
    );
    error.status = response.status;
    error.step = "send_contracts_email";
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendResponse(req, res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendResponse(req, res, 405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    verifyWebhookSignature(req, rawBody);

    const payload =
      typeof req.body === "object" && req.body
        ? req.body
        : JSON.parse(rawBody || "{}");
    const eventName = payload.event_name || payload.eventName;

    console.log("[Yousign webhook] Evento ricevuto:", {
      eventId: payload.event_id,
      eventName,
      retry: getHeader(req, "x-yousign-retry"),
    });

    if (!COMPLETED_EVENTS.has(eventName)) {
      return sendResponse(req, res, 200, { ok: true, ignored: eventName });
    }

    const signatureRequestId = getSignatureRequestId(payload);
    if (!signatureRequestId) {
      return sendResponse(req, res, 400, {
        error: "signatureRequestId non trovato nel webhook.",
      });
    }

    const attachments = await downloadSignedDocuments(signatureRequestId);
    await sendSignedDocumentsToContracts(signatureRequestId, attachments);

    return sendResponse(req, res, 200, {
      ok: true,
      signatureRequestId,
      forwardedAttachments: attachments.length,
    });
  } catch (error) {
    console.error("[Yousign webhook] Exception:", error);
    return sendResponse(req, res, error?.status || 500, {
      error: error?.message || "Errore interno webhook Yousign.",
      step: error?.step || "internal",
      upstreamStatus: error?.status || null,
      upstreamBody: error?.upstreamBody || null,
    });
  }
}
