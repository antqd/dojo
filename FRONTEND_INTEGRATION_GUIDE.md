# Frontend Files to Integrate

## File 1: src/pages/ComparazioneEstrattoAI.jsx
This component handles:
- PDF upload
- Calling `/api/analyze-statement` on your backend
- Parsing the response into 7 schema fields
- Multi-recipient email sending

**Frontend makes these API calls:**

### Call 1: Analyze Statement
```javascript
// Line ~100 in ComparazioneEstrattoAI.jsx
const response = await fetch('/api/analyze-statement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pdf_base64: base64String
  })
});

const data = await response.json();
// data.success (boolean)
// data.result (string with 7 lines)
```

### Call 2: Send Report to Multiple Recipients
```javascript
// Line ~150 in ComparazioneEstrattoAI.jsx
const response = await fetch('/api/send-comparison-report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipients: ["email1@example.com", "email2@example.com"],
    report_text: aiResult,  // raw 7-line output from Gemini
    schema: {
      transato: "€1,250.00",
      commissioni_attuali: "€8.43",
      media_attuale: "0.67%",
      commissioni_con_nuove_tariffe: "€7.34",
      nuova_media: "0.59%",
      risparmio_mensile: "€1.09",
      risparmio_annuale: "€13.08"
    }
  })
});

const data = await response.json();
// data.sent (number)
// data.failed (array)
```

---

## Integration Steps for Your Backend

### Step 1: Update Frontend API Endpoint (if different base URL)

In `src/pages/ComparazioneEstrattoAI.jsx`, change:
```javascript
const response = await fetch('/api/analyze-statement', ...
```

To:
```javascript
const response = await fetch('https://api.davveroo.it/api/analyze-statement', ...
```

(Same for `/api/send-comparison-report`)

### Step 2: Implement Backend Endpoints

Use the prompts in `BACKEND_SPECIFICATION.md` to guide your backend developer or feed to Claude/Codex to generate the code.

The two endpoints you need:
- `POST /api/analyze-statement` (calls Gemini API)
- `POST /api/send-comparison-report` (sends emails via davveroo API)

### Step 3: Set Environment Variable

On your backend server, set:
```
GEMINI_API_KEY=AIzaSyA94jn-iKSNccnemD4Mfue9tz1rD-KTGyE
```

### Step 4: Deploy Frontend

Remove/update the old Vercel `/api/` folder endpoints since they're now on your backend:
- Delete `/Users/antoniotieri/Desktop/massimo/dojo/api/analyze-statement.js`
- Delete `/Users/antoniotieri/Desktop/massimo/dojo/api/send-comparison-report.js`

Deploy frontend to Vercel (or your hosting).

---

## Files to Share with Backend Developer

1. **BACKEND_SPECIFICATION.md** - Complete API specification with prompts and pseudocode
2. **src/pages/ComparazioneEstrattoAI.jsx** - Frontend component showing API calls
3. **api/analyze-statement.js** - Reference implementation (currently in Vercel, will move to backend)
4. **api/send-comparison-report.js** - Reference implementation
