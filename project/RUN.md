# How to Run the Project

## 1. Install dependencies

```bash
npm install
```

## 2. Set up environment variables

Create a `.env` file in the project root (same folder as `package.json`) with your Supabase credentials:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- Get these from **Supabase Dashboard** → your project → **Settings** → **API** (Project URL and anon/public key).

## 3. Run the dev server

```bash
npm run dev
```

- Vite will start the app (usually at **http://localhost:5173**).
- Open that URL in your browser.

## 4. Backend (Supabase)

- **Database:** Run the migrations in `supabase/migrations/` in your Supabase project (Dashboard → SQL Editor, or `supabase db push` if using Supabase CLI).
- **Edge functions:** Deploy `categorize-request` and `analyze-employees` so AI prioritization and employee insights work. Optional: set `GEMINI_API_KEY` in Edge Function secrets (see `GEMINI_SETUP.md`).

## Other commands

| Command        | Description              |
|----------------|--------------------------|
| `npm run build` | Production build        |
| `npm run preview` | Preview production build |
| `npm run lint`   | Run ESLint              |
