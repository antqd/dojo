# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# dojo

## Analisi AI estratto conto

Questa funzionalità aggiunge nella pagina `CompilerDojo` una sezione per:

- caricare un estratto conto;
- impostare istruzioni personalizzate;
- inviare il file a un endpoint backend (`/api/analyze-statement`) che chiama OpenAI in modo sicuro.

### Configurazione ambiente

1. Copia `.env.example` in `.env.local`.
2. Imposta almeno:

- `OPENAI_API_KEY`

Opzionali:

- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `OPENAI_BANK_STATEMENT_SYSTEM_PROMPT` (istruzioni globali lato server)

### Sicurezza

Non inserire mai la chiave OpenAI nel frontend React. La chiamata verso OpenAI deve passare sempre dal backend/serverless.
