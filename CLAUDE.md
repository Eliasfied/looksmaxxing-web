# Aura: Looksmaxxing — Setup-Checkliste

Alles was eingerichtet werden muss, damit die App live und voll funktionsfähig ist.
Hak einfach ab (`- [x]`) wenn erledigt.

---

## 1. Firebase ✅ ERLEDIGT

- [x] Firebase Projekt erstellt: `looksmaxxing-web`
- [x] Firestore aktiviert
- [x] Web App registriert → alle `NEXT_PUBLIC_FIREBASE_*` Vars in `.env.local`
- [x] Service Account Key generiert → `FIREBASE_SERVICE_ACCOUNT_JSON` gesetzt
- [x] Authentication → Email/Password aktiviert
- [x] Authentication → Google aktiviert
- [x] `plans` Collection → Dokumente `aura_monthly` + `aura_yearly` angelegt
- [x] Firestore Index → `face_scans` (userId ASC + createdAt DESC) angelegt
- [x] Firestore Security Rules gesetzt
- [x] Authorized Domain `app.aura-looksmaxxing.com` in Firebase Auth hinzufügen

---

## 2. Lokaler Test ✅ LÄUFT

- [x] `npm run dev` in `apps/web` startet
- [x] Login/Register funktioniert
- [x] Dashboard erreichbar nach Login
- [x] Face Scan → PSL Score erscheint ✅
- [x] AI Chat → funktioniert ✅
- [x] Haircut Try-On → funktioniert ✅

---

## 3. OpenAI Proxy (Face Analysis + AI Chat) ← **JETZT DRAN**

- [x] OpenAI Proxy funktioniert → Face Scan klappt lokal

---

## 4. FAL AI (Haircut Try-On) ← **JETZT DRAN**

- [x] Account angelegt + API Key in `.env.local` eingetragen
- [x] Haircut Try-On funktioniert (Grok via FAL direkt)

---

## 5. Vercel Deployment ✅ ERLEDIGT

### 5.1 Web App (`apps/web`)
- [x] Vercel → New Project → GitHub Repo `looksmaxxing-web` importieren
- [x] Root Directory: `apps/web`
- [x] Framework: Next.js (auto-erkannt)
- [x] Alle Env-Vars eintragen (aus `.env.local` kopieren + FAL + RevenueCat ergänzen)
- [x] Custom Domain: `app.aura-looksmaxxing.com`

### 5.2 Marketing App (`apps/marketing`)
- [x] Vercel → New Project → gleicher Repo, Root Directory: `apps/marketing`
- [x] Framework: Astro
- [x] Env-Vars eingetragen
- [x] Custom Domain: `aura-looksmaxxing.com`

---

## 6. RevenueCat + Stripe ✅ ERLEDIGT

- [x] RevenueCat Account → Neues Projekt angelegt
- [x] Platform: **Web** (Stripe)
- [x] Stripe verbunden (bestehender Account)
- [x] Produkte in RevenueCat angelegt (`aura_monthly` + `aura_yearly`)
- [x] Entitlement `premium` angelegt → beide Produkte zugewiesen
- [x] Default Offering angelegt
- [x] Webhook eingerichtet → `https://app.aura-looksmaxxing.com/api/webhooks/revenuecat`
- [x] `REVENUECAT_WEBHOOK_SECRET` in Vercel eingetragen
- [x] `NEXT_PUBLIC_REVENUECAT_API_KEY` in Vercel eingetragen
- [x] Stripe Test-Modus: Testkauf durchführen → Credits werden in Firestore gutgeschrieben
- [x] Stripe Live-Modus aktivieren

> ⚠️ Stripe-Verifizierung kann 1–3 Tage dauern → früh anfangen!

---

## 7. Domain & DNS ✅ ERLEDIGT

- [x] Domain `aura-looksmaxxing.com` beim DNS-Provider konfiguriert:
  - `aura-looksmaxxing.com` → Vercel (Marketing App)
  - `app.aura-looksmaxxing.com` → Vercel (Web App)
- [x] SSL: Vercel automatisch
- [x] Firebase Auth: `app.aura-looksmaxxing.com` als Authorized Domain eingetragen

---

## 8. PostHog Analytics (optional)

- [ ] Account: https://posthog.com → API Key kopieren
- [ ] In Vercel eintragen:
  ```
  NEXT_PUBLIC_POSTHOG_KEY=phc_...
  NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
  ```

---

## 9. Finaler End-to-End Test ✅ ERLEDIGT

- [x] Register → Bestätigungsmail kommt an
- [x] Login → Dashboard erreichbar
- [x] Face Scan → PSL Score erscheint, Scan in Firestore `face_scans` sichtbar
- [x] Credits korrekt abgezogen (Firestore `credits` Collection)
- [x] Haircut Try-On → Bild wird generiert
- [x] AI Chat → Antworten kommen, Scan-Daten sind im Kontext
- [x] RevenueCat Kauf → Credits werden gutgeschrieben
- [x] Kündigung → Status in Firestore `subscriptions` = `cancelled`

---

## 10. SEO Einrichtung ← **JETZT DRAN**

### 10.1 Google Search Console (GSC)
- [ ] Property `aura-looksmaxxing.com` anlegen (Domain-Property via DNS-Verifizierung)
- [ ] Sitemap einreichen: `https://aura-looksmaxxing.com/sitemap.xml`
- [ ] URL Inspection → Startseite indexieren lassen
- [ ] Core Web Vitals Report prüfen

### 10.2 Bing Webmaster Tools
- [ ] Account anlegen: https://www.bing.com/webmasters
- [ ] Site `aura-looksmaxxing.com` hinzufügen (DNS-Verifizierung oder GSC-Import)
- [ ] Sitemap einreichen
- [ ] IndexNow Key generieren → in Marketing App einbinden (wie bei Banana AI: `scripts/indexnow.mjs`)

### 10.3 Blog-Post-Automations-Script
- [ ] Keywords-CSV anlegen (`apps/marketing/src/data/keywords.csv`) mit Looksmaxxing-Keyword-Clustern
- [ ] Script `scripts/generate-blog-posts.mjs` erstellen (analog zu Banana AI `generate-explore-pages.mjs`)
  - Claude API → Blog-Post-Inhalt generieren (Titel, Meta, Volltext, FAQ)
  - Frontmatter für Astro Content Collections
  - Git → commit auf Review-Branch (oder `--auto` für main)
  - Keywords-CSV → Cluster als "generated" markieren
- [ ] Astro Content Collection für Blog einrichten (`src/content/blog/`)
- [ ] Blog-Listing-Page + einzelne Post-Page erstellen
- [ ] Erstes Batch generieren: `node scripts/generate-blog-posts.mjs --count 10`

---

## Empfohlene Reihenfolge als nächstes

1. **GSC** → Property anlegen + Sitemap einreichen
2. **Bing** → Site hinzufügen + IndexNow einbinden
3. **Blog-Script** → Keywords-CSV + Script aufbauen
4. **Ersten Blog-Batch** generieren (10–20 Posts)
5. **PostHog** (optional) → Analytics aufsetzen
