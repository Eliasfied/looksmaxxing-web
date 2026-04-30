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
- [ ] Authorized Domain `app.looksmaxxing.ai` in Firebase Auth hinzufügen
  → kommt später wenn Domain eingerichtet ist

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

## 5. Vercel Deployment

### 5.1 Web App (`apps/web`)
- [ ] Vercel → New Project → GitHub Repo `looksmaxxing-web` importieren
- [ ] Root Directory: `apps/web`
- [ ] Framework: Next.js (auto-erkannt)
- [ ] Alle Env-Vars eintragen (aus `.env.local` kopieren + FAL + RevenueCat ergänzen):
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
  FIREBASE_SERVICE_ACCOUNT_JSON
  REVENUECAT_WEBHOOK_SECRET
  NEXT_PUBLIC_REVENUECAT_API_KEY
  FAL_API_KEY
  NEXT_PUBLIC_POSTHOG_KEY
  NEXT_PUBLIC_POSTHOG_HOST
  ```
- [ ] Custom Domain: `app.looksmaxxing.ai`

### 5.2 Marketing App (`apps/marketing`)
- [ ] Vercel → New Project → gleicher Repo, Root Directory: `apps/marketing`
- [ ] Framework: Astro
- [ ] Env-Vars:
  ```
  PUBLIC_BRAND_NAME=Aura: Looksmaxxing
  PUBLIC_APP_URL=https://app.looksmaxxing.ai
  PUBLIC_SITE_URL=https://looksmaxxing.ai
  ```
- [ ] Custom Domain: `looksmaxxing.ai`

---

## 6. RevenueCat + Stripe

- [ ] RevenueCat Account → https://app.revenuecat.com → Neues Projekt
- [ ] Platform: **Web** (Stripe)
- [ ] Stripe verbinden → https://stripe.com (Konto anlegen falls noch keins)
- [ ] Stripe-Preise anlegen:
  - `aura_monthly` → $9.99/mo recurring
  - `aura_yearly` → $49.99/yr recurring
- [ ] In RevenueCat: Produkte mit Stripe-Preis-IDs verknüpfen
- [ ] Entitlement `premium` anlegen → beide Produkte zuweisen
- [ ] Default Offering anlegen → beide Pakete
- [ ] Webhook einrichten:
  - URL: `https://app.looksmaxxing.ai/api/webhooks/revenuecat`
  - Authorization Header Wert → als `REVENUECAT_WEBHOOK_SECRET` in Vercel
  - Events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
- [ ] Public API Key → als `NEXT_PUBLIC_REVENUECAT_API_KEY` in Vercel
- [ ] Stripe Test-Modus: Testkauf durchführen → Credits werden in Firestore gutgeschrieben?
- [ ] Stripe Live-Modus aktivieren (nach erfolgreichem Test)

> ⚠️ Stripe-Verifizierung kann 1–3 Tage dauern → früh anfangen!

---

## 7. Domain & DNS

- [ ] Domain `looksmaxxing.ai` beim DNS-Provider (Cloudflare o.ä.) konfigurieren:
  - `looksmaxxing.ai` → Vercel (Marketing App)
  - `app.looksmaxxing.ai` → Vercel (Web App)
- [ ] SSL: Vercel macht das automatisch
- [ ] Firebase Auth: `app.looksmaxxing.ai` als Authorized Domain eintragen

---

## 8. PostHog Analytics (optional)

- [ ] Account: https://posthog.com → API Key kopieren
- [ ] In Vercel eintragen:
  ```
  NEXT_PUBLIC_POSTHOG_KEY=phc_...
  NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
  ```

---

## 9. Finaler End-to-End Test

- [ ] Register → Bestätigungsmail kommt an
- [ ] Login → Dashboard erreichbar
- [ ] Face Scan → PSL Score erscheint, Scan in Firestore `face_scans` sichtbar
- [ ] Credits korrekt abgezogen (Firestore `credits` Collection)
- [ ] Haircut Try-On → Bild wird generiert
- [ ] AI Chat → Antworten kommen, Scan-Daten sind im Kontext
- [ ] RevenueCat Kauf → Credits werden gutgeschrieben
- [ ] Kündigung → Status in Firestore `subscriptions` = `cancelled`

---

## Empfohlene Reihenfolge als nächstes

1. **OpenAI Proxy testen** → einfach lokal Face Scan machen
2. **FAL API Key** holen → Haircut Try-On testen
3. **Vercel** deployen (beide Apps)
4. **RevenueCat + Stripe** einrichten (Stripe-Verifizierung einplanen!)
5. **Domain & DNS**
6. **Firebase Auth** → `app.looksmaxxing.ai` als Authorized Domain
7. **Finaler Test**
