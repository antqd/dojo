import { Buffer } from "node:buffer";
import process from "node:process";

const DEFAULT_YOUSIGN_BASE_URL = "https://api-sandbox.yousign.app/v3";

const DEFAULT_SIGNATURE_FIELDS = [
  { page: 2, x: 380, y: 670, width: 180, height: 45 },
  { page: 3, x: 380, y: 670, width: 180, height: 45 },
];

function sendResponse(req, res, status, body) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

function splitFullName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ") || firstName;
  return { firstName, lastName };
}

function getSignatureFields(documentId, requestedFields) {
  const configured = process.env.YOUSIGN_SIGNATURE_FIELDS;
  const fields = Array.isArray(requestedFields)
    ? requestedFields
    : configured
      ? JSON.parse(configured)
      : DEFAULT_SIGNATURE_FIELDS;

  return fields.map((field) => ({
    type: "signature",
    document_id: documentId,
    page: Number(field.page),
    x: Number(field.x),
    y: Number(field.y),
    width: Number(field.width || 180),
    height: Number(field.height || 45),
  }));
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
  if (data.detail || data.message || data.error) {
    return JSON.stringify(data.detail || data.message || data.error);
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

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendResponse(req, res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendResponse(req, res, 405, { error: "Method not allowed" });
  }

  try {
    const { document, signer, signatureRequest } = req.body || {};

    if (!document?.base64) {
      return sendResponse(req, res, 400, { error: "PDF mancante." });
    }

    if (!signer?.fullName || !signer?.email) {
      return sendResponse(req, res, 400, {
        error: "Dati firmatario mancanti.",
      });
    }

    const signatureRequestPayload = {
      name: signatureRequest?.name || "Modulo adesione Davveroo",
      delivery_mode: signatureRequest?.deliveryMode || "email",
      timezone: "Europe/Rome",
    };

    if (signatureRequest?.externalId) {
      signatureRequestPayload.external_id = signatureRequest.externalId;
    }

    const createdRequest = await yousignFetch("/signature_requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signatureRequestPayload),
    }, "create_signature_request");

    const fileBuffer = Buffer.from(document.base64, "base64");
    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new Blob([fileBuffer], {
        type: document.mimeType || "application/pdf",
      }),
      document.filename || "modulo_adesione_expopay.pdf"
    );
    uploadForm.append("nature", "signable_document");

    const uploadedDocument = await yousignFetch(
      `/signature_requests/${createdRequest.id}/documents`,
      {
        method: "POST",
        body: uploadForm,
      },
      "upload_document"
    );

    const { firstName, lastName } = splitFullName(signer.fullName);
    const signerPayload = {
      info: {
        first_name: firstName,
        last_name: lastName,
        email: signer.email,
        locale: signer.locale || "it",
      },
      signature_level: "electronic_signature",
      signature_authentication_mode:
        signer.signatureAuthenticationMode ||
        signatureRequest?.signatureAuthenticationMode ||
        "no_otp",
      fields: getSignatureFields(
        uploadedDocument.id,
        signatureRequest?.signatureFields
      ),
    };

    if (signer.phoneNumber) {
      signerPayload.info.phone_number = signer.phoneNumber;
    }

    const createdSigner = await yousignFetch(
      `/signature_requests/${createdRequest.id}/signers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signerPayload),
      },
      "create_signer"
    );

    const activatedRequest = await yousignFetch(
      `/signature_requests/${createdRequest.id}/activate`,
      { method: "POST" },
      "activate_signature_request"
    );

    const activatedSigner =
      activatedRequest?.signers?.find((item) => item.id === createdSigner.id) ||
      createdSigner;

    return sendResponse(req, res, 200, {
      signatureRequestId: createdRequest.id,
      documentId: uploadedDocument.id,
      signerId: createdSigner.id,
      status: activatedRequest.status,
      signatureLink: activatedSigner?.signature_link || null,
      signatureLinkExpirationDate:
        activatedSigner?.signature_link_expiration_date || null,
    });
  } catch (error) {
    console.error("[Yousign] Exception:", error);
    return sendResponse(req, res, error?.status || 500, {
      error: error?.message || "Errore interno durante avvio firma Yousign.",
      step: error?.step || "internal",
      upstreamStatus: error?.status || null,
      upstreamBody: error?.upstreamBody || null,
    });
  }
}
