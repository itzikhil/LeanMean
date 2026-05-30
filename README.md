# Lean Kitchen Tracker

A personal macro & meal tracker — pre-loaded with your 2,100 kcal menu and tuned to how you actually diet (protein-priority, weekly averages, training/rest targets). Built as an installable PWA.

**Stack:** Vite + React + TypeScript + Tailwind · Supabase (auth + cloud sync) · recharts · html5-qrcode · vite-plugin-pwa

## Features (v1)
- **Daily dashboard** — calories & macros eaten vs. remaining, with a training/rest day toggle.
- **Your menu, one tap** — all 14 plan dishes + free sauces pre-loaded.
- **Barcode → Open Food Facts** — scan a label, enter grams, macros auto-fill (free, EU-strong, no key).
- **My Foods / recents** — custom entries and scans are saved and frecency-sorted for one-tap re-logging.
- **Trends** — 14-day calorie chart vs. goal, 7-day average kcal/protein, and a weight log with weekly-trend (kg/week).
- **Editable targets** — separate training & rest presets.

## 1. Supabase setup (one time)
1. Create a project at supabase.com.
2. SQL editor → paste & run `supabase/schema.sql` (creates tables + row-level security so only you see your data).
3. Authentication → Providers → keep **Email** enabled (magic-link sign-in is used; no passwords).
4. Project settings → API → copy the **Project URL** and **anon public key**.

## 2. Local run
```bash
npm install
cp .env.example .env        # then paste your two Supabase values into .env
npm run dev
```
Open the printed localhost URL, sign in with your email (magic link), and start logging.

## 3. Ship to GitHub
```bash
git init
git add .
git commit -m "Lean Kitchen Tracker v1"
git branch -M main
git remote add origin git@github.com:YOUR_USER/lean-kitchen-tracker.git
git push -u origin main
```

## 4. Deploy to Vercel
```bash
npm i -g vercel        # if not installed
vercel                 # link/create the project (framework auto-detected: Vite)
# add env vars (or do it in the Vercel dashboard → Settings → Environment Variables):
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```
After deploy, add your Vercel URL to **Supabase → Authentication → URL Configuration → Redirect URLs** so the magic link returns to your live site. Then open it on your phone and "Add to Home Screen" to install the PWA.

## Notes & next steps
- The production bundle is ~1.1 MB (recharts + scanner + supabase). Fine for personal use; lazy-load the Trends view and scanner later if you want it leaner.
- Menu data lives in `src/lib/menu.ts`; targets in `src/lib/targets.ts`.
- Ideas parked for v2: recipe builder, CSV export, streaks, Apple Health / Google Fit weight sync.
