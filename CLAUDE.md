# Aura: Looksmaxxing — Setup-Checkliste

Alles was eingerichtet werden muss, damit die App live und voll funktionsfähig ist.
Hak einfach ab (`- [x]`) wenn erledigt.

---

## 1. Firebase

### 1.1 Projekt anlegen
- [ ] Firebase Console aufrufen → https://console.firebase.google.com
- [ ] Neues Projekt erstellen: `aura-looksmaxxing` (oder ähnlich)
- [ ] **Authentication** aktivieren → Sign-in methods:
  - [ ] Email/Password aktivieren
  - [ ] Google aktivieren (OAuth Client ID wird automatisch erstellt)
- [ ] **Firestore Database** aktivieren → Produktionsmodus, Region: `europe-west1` (oder `us-central1`)
- [ ] **Storage** aktivieren (für zukünftige Foto-Uploads, optional)

### 1.2 Firestore Collections anlegen (automatisch beim ersten Schreiben, aber Indexes manuell)
- [ ] Index anlegen: Collection `face_scans`, Felder: `userId ASC` + `createdAt DESC`
  → Firebase Console → Firestore → Indexes → Zusammengesetzter Index hinzufügen
- [ ] Firestore Security Rules setzen (nur eingeloggte User dürfen eigene Docs lesen/schreiben):
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /face_scans/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      }
      match /credits/{userId} {
        allow read: if request.auth != null && request.auth.uid == userId;
      }
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```

### 1.3 Firestore Dokumente manuell anlegen (für RevenueCat-Pläne)
- [ ] Collection `plans` → Dokument `aura_monthly`:
  ```json
  {
    "revenuecat_product_id": "aura_monthly",
    "name": "Monthly",
    "monthly_credits": 50
  }
  ```
- [ ] Collection `plans` → Dokument `aura_yearly`:
  ```json
  {
    "revenuecat_product_id": "aura_yearly",
    "name": "Yearly",
    "monthly_credits": 50
  }
  ```

### 1.4 Service Account für Admin SDK
- [ ] Firebase Console → Projekteinstellungen → Service Accounts
- [ ] „Neuen privaten Schlüssel generieren" → JSON herunterladen
- [ ] Den gesamten JSON-Inhalt als **eine Zeile** in `FIREBASE_SERVICE_ACCOUNT_JSON` eintragen (in Vercel und `.env.local`)

### 1.5 Web App registrieren & Env-Vars holen
- [ ] Firebase Console → Projekteinstellungen → Deine Apps → Web-App hinzufügen
- [ ] Config-Objekt kopieren → in `.env.local` (und Vercel) eintragen:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  ```
- [ ] Authorized Domains in Firebase Auth hinzufügen:
  - `app.looksmaxxing.ai`
  - `localhost`

---

## 2. RevenueCat

### 2.1 Projekt & Produkte anlegen
- [ ] RevenueCat Dashboard → https://app.revenuecat.com → Neues Projekt
- [ ] Platform: **Web** (Stripe)
- [ ] Produkte anlegen:
  - [ ] `aura_monthly` → Monatlich, $9.99
  - [ ] `aura_yearly` → Jährlich, $49.99
- [ ] Entitlements anlegen: `premium` → beide Produkte zuweisen
- [ ] Offerings anlegen: Default Offering → beide Pakete

### 2.2 Webhook einrichten
- [ ] RevenueCat → Project Settings → Integrations → Webhooks
- [ ] URL: `https://app.looksmaxxing.ai/api/webhooks/revenuecat`
- [ ] Authorization Header setzen → diesen Wert als `REVENUECAT_WEBHOOK_SECRET` in Vercel speichern
- [ ] Events aktivieren: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `NON_SUBSCRIPTION_PURCHASE`

### 2.3 API Key
- [ ] RevenueCat → Project Settings → API Keys → Public (Web) Key kopieren
- [ ] In Vercel eintragen: `NEXT_PUBLIC_REVENUECAT_API_KEY`

---

## 3. Stripe (über RevenueCat Web Billing)

> RevenueCat Web Billing nutzt Stripe im Hintergrund. Du brauchst kein eigenes Stripe-Konto direkt verdrahten — RevenueCat übernimmt das.

- [ ] RevenueCat → Integrations → Stripe verbinden
- [ ] Stripe-Konto verknüpfen (oder neu erstellen auf https://stripe.com)
- [ ] Stripe-Preise für `aura_monthly` ($9.99/mo) und `aura_yearly` ($49.99/yr) anlegen → IDs in RevenueCat-Produkte eintragen
- [ ] Stripe Test-Modus erst testen, dann auf Live umschalten

---

## 4. Vercel Deployment

### 4.1 Web App (`apps/web`) deployen
- [ ] Vercel → New Project → GitHub Repo importieren
- [ ] Root Directory: `apps/web`
- [ ] Framework: Next.js
- [ ] Alle Env-Vars aus `.env.example` eintragen (Firebase, RevenueCat, FAL, PostHog)
- [ ] Custom Domain: `app.looksmaxxing.ai` → DNS CNAME auf `cname.vercel-dns.com` zeigen

### 4.2 Marketing App (`apps/marketing`) deployen
- [ ] Vercel → New Project → gleicher Repo
- [ ] Root Directory: `apps/marketing`
- [ ] Framework: Astro
- [ ] Env-Vars eintragen (PUBLIC_BRAND_NAME, PUBLIC_APP_URL, PUBLIC_SITE_URL)
- [ ] Custom Domain: `looksmaxxing.ai` → DNS A-Record auf Vercel IPs

### 4.3 Env-Vars für Marketing (Astro)
```
PUBLIC_BRAND_NAME=Aura: Looksmaxxing
PUBLIC_APP_URL=https://app.looksmaxxing.ai
PUBLIC_SITE_URL=https://looksmaxxing.ai
```

---

## 5. FAL AI (Haircut Try-On)

- [ ] Account anlegen: https://fal.ai
- [ ] API Key generieren → in Vercel eintragen: `FAL_API_KEY`
- [ ] Modell testen: `xai/grok-imagine-image/edit` via Proxy `https://fal-ai-secure-proxy-new.vercel.app`
  > Achtung: Das ist ein externer Proxy. Prüfen ob er noch funktioniert oder eigenen FAL-Key direkt einsetzen.

---

## 6. OpenAI Proxy (Face Analysis + AI Chat)

- [ ] Prüfen ob `https://openai-secure-proxy.vercel.app` noch erreichbar ist
- [ ] Model `gpt-4.1-mini` testen
- [ ] Falls der Proxy abläuft: eigenen OpenAI API Key holen (https://platform.openai.com) und den Proxy-Code ersetzen mit direktem `fetch` zu `https://api.openai.com/v1/chat/completions` + `Authorization: Bearer $OPENAI_API_KEY`

---

## 7. PostHog Analytics (optional)

- [ ] Account anlegen: https://posthog.com
- [ ] Projekt erstellen → API Key kopieren
- [ ] Env-Vars eintragen:
  ```
  NEXT_PUBLIC_POSTHOG_KEY=phc_...
  NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
  ```

---

## 8. Domain & DNS

- [ ] Domain `looksmaxxing.ai` in DNS-Provider (z.B. Cloudflare) konfigurieren:
  - `looksmaxxing.ai` → Vercel (Marketing)
  - `app.looksmaxxing.ai` → Vercel (Web App)
- [ ] SSL-Zertifikate: Vercel erledigt das automatisch
- [ ] In Firebase Auth: `app.looksmaxxing.ai` als Authorized Domain eintragen (→ Schritt 1.5)

---

## 9. Finaler Test (alles live)

- [ ] Register → E-Mail kommt an, Verification Link funktioniert
- [ ] Login → Dashboard erreichbar
- [ ] Face Scan hochladen → PSL Score erscheint, Daten in Firestore `face_scans` sichtbar
- [ ] Credits werden korrekt abgezogen (Firestore `credits` Collection prüfen)
- [ ] Haircut Try-On → Bild wird generiert
- [ ] AI Chat → Antworten kommen mit Scan-Kontext
- [ ] RevenueCat Kaufflow → Abo abschließen → Credits werden gutgeschrieben (Webhook-Log in RevenueCat prüfen)
- [ ] Kündigung → Status in Firestore `subscriptions` wechselt auf `cancelled`

---

## Reihenfolge empfohlen

1. Firebase einrichten (1.1–1.5)
2. Vercel deployen (4.1–4.2) mit Dummy-Env-Vars, um zu sehen ob der Build läuft
3. FAL + OpenAI Proxy testen
4. RevenueCat + Stripe (3–4 Tage Stripe-Verifizierung einplanen)
5. Domain & DNS
6. Finaler End-to-End-Test
