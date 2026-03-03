# Bank Statement Analysis Backend API - Specification

## Overview
Create two endpoints on `api.davveroo.it/api/` to handle:
1. Bank statement PDF analysis using Google Gemini AI
2. Multi-recipient report email distribution

---

## Endpoint 1: POST `/api/analyze-statement`

### Purpose
Receive a base64-encoded PDF bank statement, analyze it with Google Gemini, extract transaction data, and calculate commission savings based on fixed tariffs.

### Request Format
```json
{
  "pdf_base64": "JVBERi0xLjQKJeLj...",
  "prompt": "Optional custom prompt override (string)"
}
```

### Request Details
- `pdf_base64`: Base64-encoded PDF file (bank statement image/document)
- `prompt` (optional): Can override the system prompt if sent from frontend

### Response Format
```json
{
  "success": true,
  "result": "Debit: 0.50%\nCredit: 0.60%\nCommercial: 1.10%\nAmex: 1.80%\n\nMedia finale stimata: 0.65%\nRisparmio mensile stimato: €12.50\nRisparmio annuale stimato: €150.00"
}
```

On error:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Backend Implementation Requirements

#### 1. Google Gemini API Integration
```
- Use Google Generative AI (Gemini 1.5 Pro model)
- API Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
- API Key: Store in environment variable GEMINI_API_KEY
- Model: gemini-1.5-pro
```

#### 2. System Prompt (Fixed - Server-locked, not user-editable)
```
Analizza il PDF dell'estratto conto che ti viene fornito.

1. Estrai:
- Transato totale mensile
- Commissioni totali
- Percentuale media attuale (Commissioni / Transato)

🎯 Obiettivo: battere lo 0,75% medio e portare il cliente a circa 0,65% medio.

2. Calcola quali devono essere le tariffe variabili (senza costi fissi) per:
- Debit
- Credit
- Commercial
- Amex

in modo che:
- La media finale sia circa 0,65%
- Il cliente risparmi almeno 0,10% rispetto alla media attuale

3. Output richiesto (solo questo, niente spiegazioni):

Debit: [percentage]%
Credit: [percentage]%
Commercial: [percentage]%
Amex: [percentage]%

Media finale stimata: [percentage]%
Risparmio mensile stimato: €[amount]
Risparmio annuale stimato: €[amount]

Non inserire testo aggiuntivo. Solo numeri chiari.
```

#### 3. Request Payload to Gemini API
```javascript
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "[SYSTEM_PROMPT]"
        },
        {
          "text": "[ADDITIONAL_INSTRUCTION]"
        },
        {
          "inline_data": {
            "mime_type": "application/pdf",
            "data": "[BASE64_PDF_DATA]"
          }
        }
      ]
    }
  ]
}
```

#### 4. Additional Instruction
```
Analizza il documento PDF allegato e fornisci l'output nel formato specificato.
```

#### 5. Response Parsing from Gemini
- Extract from: `data.candidates[0].content.parts[0].text`
- Return the raw text as-is in the `result` field
- Frontend will parse the 7 lines into structured schema

#### 6. Error Handling
- API key missing: Return HTTP 500 with error message
- Invalid base64: Return HTTP 400 with error message
- Gemini API timeout/error: Return HTTP 500 with Gemini error details
- PDF parsing issue: Return HTTP 500 with appropriate message

### Implementation Pseudocode
```javascript
POST /api/analyze-statement
  1. Validate pdf_base64 is properly formatted
  2. Get GEMINI_API_KEY from environment
  3. Build request payload with:
     - System prompt (fixed string above)
     - Additional instruction
     - Base64 PDF as inline_data
  4. Send POST to Gemini API with:
     - URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=[API_KEY]
     - Headers: Content-Type: application/json
     - Body: Built payload
  5. Parse response: texts = data.candidates[0].content.parts[0].text
  6. Return: { "success": true, "result": texts }
  7. On error: { "success": false, "error": "[error_details]" }
```

---

## Endpoint 2: POST `/api/send-comparison-report`

### Purpose
Send analysis report to multiple recipients via email using the davveroo email API.

### Request Format
```json
{
  "recipients": ["email1@example.com", "email2@example.com"],
  "report_text": "Debit: 0.50%\nCredit: 0.60%\nCommercial: 1.10%\nAmex: 1.80%\n\nMedia finale stimata: 0.65%\nRisparmio mensile stimato: €12.50\nRisparmio annuale stimato: €150.00",
  "schema": {
    "debit": "0.50%",
    "credit": "0.60%",
    "commercial": "1.10%",
    "amex": "1.80%",
    "media_finale": "0.65%",
    "risparmio_mensile": "€12.50",
    "risparmio_annuale": "€150.00"
  }
}
```

### Response Format
Success:
```json
{
  "sent": 2,
  "failed": []
}
```

Partial failure (HTTP 207):
```json
{
  "sent": 1,
  "failed": [
    {
      "recipient": "invalid@example",
      "ok": false,
      "status": 400,
      "error": "Invalid email format"
    }
  ]
}
```

### Backend Implementation Requirements

#### 1. Email Validation
- Use regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Reject and track invalid emails

#### 2. Deduplicate Recipients
- Remove duplicate email addresses

#### 3. Build Email Message
```
Subject: Comparazione Estratto Conto - Analisi AI

Body:
Debit: 0.50%
Credit: 0.60%
Commercial: 1.10%
Amex: 1.80%

Media finale stimata: 0.65%
Risparmio mensile stimato: €12.50
Risparmio annuale stimato: €150.00

---

Analisi dettagliata:
[report_text]
```

#### 4. Send via davveroo API
For each valid recipient:
```
POST https://api.davveroo.it/api/email/attivazione
Content-Type: application/json

{
  "recipient": "email@example.com",
  "subject": "Comparazione Estratto Conto - Analisi AI",
  "body": "[formatted_message_above]",
  "sender_name": "Comparazione AI"
}
```

#### 5. Track Success/Failure
- Success: Add count to `sent`
- Failure: Add to `failed` array with recipient, status code, and error message
- Return HTTP 207 if any emails fail (but some succeeded)
- Return HTTP 200 if all succeeded
- Return HTTP 400 if all failed or no valid recipients

### Implementation Pseudocode
```javascript
POST /api/send-comparison-report
  1. Validate request body has recipients, report_text, schema
  2. Validate and deduplicate recipients
  3. Track: sent_count = 0, failed_array = []
  4. For each recipient:
     a. Validate email format
     b. Build formatted message with schema fields + report_text
     c. Send POST to https://api.davveroo.it/api/email/attivazione
     d. If success: sent_count++
     e. If fail: failed_array.push({recipient, status, error})
  5. Return appropriate HTTP status and response
```

---

## Environment Variables Needed

```
GEMINI_API_KEY=AIzaSyA94jn-iKSNccnemD4Mfue9tz1rD-KTGyE
```

---

## Frontend Contract (Frontend will send)

Frontend will call your backend with:
- `POST https://api.davveroo.it/api/analyze-statement` with base64 PDF
- `POST https://api.davveroo.it/api/send-comparison-report` with recipients and schema

Frontend expects responses in the exact formats specified above.

---

## Testing

### Test Request 1: Analyze Statement
```bash
curl -X POST https://api.davveroo.it/api/analyze-statement \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_base64": "[BASE64_PDF_HERE]"
  }'
```

Expected response:
```json
{
  "success": true,
  "result": "Debit: 0.50%\nCredit: 0.60%\nCommercial: 1.10%\nAmex: 1.80%\n\nMedia finale stimata: 0.65%\nRisparmio mensile stimato: €12.50\nRisparmio annuale stimato: €150.00"
}
```

### Test Request 2: Send Report
```bash
curl -X POST https://api.davveroo.it/api/send-comparison-report \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["test@example.com"],
    "report_text": "Debit: 0.50%\nCredit: 0.60%\nCommercial: 1.10%\nAmex: 1.80%\n\nMedia finale stimata: 0.65%\nRisparmio mensile stimato: €12.50\nRisparmio annuale stimato: €150.00",
    "schema": {"debit": "0.50%", "credit": "0.60%", "commercial": "1.10%", "amex": "1.80%", "media_finale": "0.65%", "risparmio_mensile": "€12.50", "risparmio_annuale": "€150.00"}
  }'
```

Expected response:
```json
{
  "sent": 1,
  "failed": []
}
```
