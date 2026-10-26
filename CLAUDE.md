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

## 8. PostHog Analytics ← **NICHT MEHR OPTIONAL**

Ohne das sieht niemand, wo der Funnel bricht. Der Code ist fertig instrumentiert
(`posthog-provider.tsx`, Events `tool_upload_started` → `tool_preview_created` →
`tool_preview_viewed` → `tool_unlock_clicked` → `tool_report_unlocked`).

- [x] Projekt in eigener Organisation, Region **EU**
- [x] API Key in `.env.local` eingetragen
- [x] In Vercel (`apps/web`) eingetragen, Production + Preview + Development:
  ```
  NEXT_PUBLIC_POSTHOG_KEY=phc_...
  NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
  ```
- [x] **Redeployt** — Key als Literal im ausgelieferten Bundle verifiziert
- [ ] Funnel anlegen, aufgeschlüsselt nach `aura_source` (Herkunfts-Seite) und `tool`

> Der Provider initialisiert nur bei `NODE_ENV === 'production'` — lokal kommen
> bewusst keine Events an. Session Recording und Autocapture sind aus und müssen
> aus bleiben: Nutzer laden ihr Gesicht hoch.
>
> Die Marketing-App (Astro) hat **kein** PostHog. Die Zuordnung läuft über den
> `?source=`-Parameter in jedem Tool-Link, der als Super-Property `aura_source`
> registriert wird. Das spart ein Cookie-Banner.

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

## 10. SEO Einrichtung

### 10.1 Google Search Console (GSC) ✅ ERLEDIGT
- [x] Property `aura-looksmaxxing.com` angelegt (Domain-Property via DNS-Verifizierung)
- [x] Sitemap eingereicht: `https://www.aura-looksmaxxing.com/sitemap-index.xml`
      (⚠️ NICHT `/sitemap.xml` — die existiert nicht und liefert 404)
- [x] Startseite indexiert
- [ ] Core Web Vitals Report prüfen

### 10.2 Bing Webmaster Tools
- [x] Account + Property stehen, Search Performance liefert Daten
      (Stand 2026-10-26: 265 Klicks / 27,6K Impressions, steigend).
- [x] Sitemap eingereicht und erfolgreich gecrawlt (zuletzt 2026-10-24).
      Bings „URLs discovered: 1" pro Zeile ist korrekt: die Zeile ist ein
      *Sitemap Index*, und der enthält genau ein Kind (`sitemap-0.xml`) mit
      aktuell 171 URLs. Kein Fehler.
      Der zusätzliche Apex-Eintrag `aura-looksmaxxing.com/sitemap-index.xml`
      kann weg — er leitet per 308 auf die www-Variante, die schon drin ist.
- [x] IndexNow Key: `12aa09fb4abee29fdfc774d3fe6b4224`, ausgeliefert unter
      `/12aa09fb4abee29fdfc774d3fe6b4224.txt` (Datei liegt in `apps/marketing/public/`).
      `scripts/indexnow.mjs` zeigte vorher auf `getbanana.ai` — behoben.
      Läuft automatisch im `daily-content` Workflow für neu veröffentlichte Seiten.
      Bestand einmalig angemeldet (2026-10-26, 171 URLs, HTTP 200).
      Nochmal alles anmelden — nur bei Bedarf, nicht routinemäßig:
      `node scripts/indexnow.mjs --all`
- [ ] In Webmaster Tools unter „IndexNow" prüfen, dass die Pings ankommen.
      ⚠️ Dort **nicht** „Get Started" klicken — das erzeugt einen *neuen* Key.
      Unserer liegt schon und funktioniert (Test-Submit 2026-10-26: HTTP 202).
      Die Seite zeigt die Einstiegs-Werbung, bis Bing die ersten Pings verarbeitet
      hat; das dauert bis zu einen Tag.

> Bings Hinweis „Some URLs are not getting indexed due to robots NOINDEX meta tags"
> ist **kein Fehler**: er betrifft `app.aura-looksmaxxing.com`, das in
> `apps/web/app/layout.tsx` bewusst auf `index: false` steht. Die Marketing-Site
> setzt nirgends `noindex` (geprüft 2026-10-26, live und im Code).

> IndexNow bedient Bing, Yandex, Seznam und Naver — **nicht Google**. Der direkte
> Traffic-Effekt ist klein; relevant ist, dass ChatGPT-Suche und Copilot auf dem
> Bing-Index aufsetzen.

### 10.3 Content-Automation ✅ ERLEDIGT
- [x] Keywords-CSV (`apps/marketing/src/data/keywords.csv`) — 126 Cluster
- [x] Script `scripts/generate-content.mjs` (blog + tool + glossary)
- [x] Astro Content Collections (`src/content/{blog,glossary,tools}/`)
- [x] Listing- und Detail-Pages für alle drei Typen
- [x] GitHub Action `daily-content.yml` — 1 Seite/Tag, 15:00 UTC
- [x] `scripts/relink-content.mjs` — interne Verlinkung, läuft automatisch nach jeder Generierung

---

## 11. Offene SEO-Baustellen (Audit 2026-09-21)

### 🔴 Sofort
- [x] ~~Anthropic API Guthaben aufladen~~ — überholt. Die Generierung läuft; der
      Stillstand vom 15.–23.10. hatte eine andere Ursache: jede Seite landete als
      `draft: true`, weil ein abgelehntes Bild den ganzen Artikel blockierte und
      die Produktbehauptungs-Regel Negation ignorierte. Behoben, 9 Drafts
      nachträglich freigegeben. Seit 24.10. sind die Runs grün.
- [x] ~~Vercel Apex-Redirect auf 308 umstellen~~ — erledigt. Geprüft 2026-10-26:
      `/`, `/blog` und `/pricing` auf dem Apex liefern alle 308.
- [x] ~~GSC „Seite mit Weiterleitung" validieren~~ — **nichts zu tun, Report ist
      kosmetisch.** Die 75 fehlgeschlagenen URLs sind keine Apex-URLs, wie hier
      vorher stand, sondern **www-URLs mit Trailing Slash**
      (`…/blog/bimax-before-after/`). Geprüft 2026-10-26:
      - der Slash-Redirect liefert 308 auf die kanonische Variante ✓
      - `canonical` zeigt überall auf die Version ohne Slash ✓
      - die Sitemap enthält keine einzige Slash-URL ✓
      - im gebauten HTML gibt es keinen internen Link mit Slash ✓
      - `astro.config.mjs` steht auf `trailingSlash: 'never'` ✓
      Die Validierung **muss** fehlschlagen: sie prüft, ob die URLs noch
      weiterleiten — und das tun sie, absichtlich und dauerhaft. „Seite mit
      Weiterleitung" ist ein Hinweis, kein Fehler; indexiert wird das Ziel.
      Google hat die Slash-Varianten aus einer früheren Konfiguration im
      Gedächtnis und vergisst sie mit der Zeit. Erneutes Anstoßen ändert nichts.

### 🟡 Danach
- [x] ~~Bild-Backfill~~ — erledigt. Alle 119 veröffentlichten Blog-Seiten haben
      ihre drei Bilder. Nachlauf bei Bedarf:
      `node scripts/generate-content.mjs --backfill-images --count N`
      Der Modus brieft nur die fehlenden Slots neu; bereits freigegebene Bilder
      werden aus dem Cache wiederverwendet und kosten nichts.
- [ ] Bilder ohne `width`/`height` (12 von 16 auf der Startseite) → CLS
- [ ] **Keywords nachfüllen** — die Audit-Zahl („45 Cluster, ~6 Wochen") ist
      überholt, seit 106 Gap-Keywords dazukamen. Stand 2026-10-26:

      | | Seiten | Volumen | Schnitt |
      |---|---|---|---|
      | erledigt | 158 | 639.610 | 4.048 |
      | offen | 126 | 9.690 | **77** |

      Der Vorlauf ist also 126 Tage, nicht 6 Wochen — aber die Queue ist
      ausgelutscht. `getPendingPages` sortiert bereits nach Volumen absteigend
      (plus Boost für Produkt-Intent und Frauen-Content), es steht oben nur
      nichts Großes mehr: die nächsten Picks liegen bei 400.
      Priorisierung ist also **nicht** das Problem, neue Begriffe sind es.

      Stärkste Lücke: **Produkt-Vergleiche und Kaufabsicht**. Von 285 Slugs sind
      25 Vergleiche — aber alle konzeptuell (`hunter-eyes-vs-prey-eyes`), kein
      einziger Produktvergleich. Genau dort ranken softmaxx.io,
      realworldappeal.com, looksmaxxing.guide, qoves.com, selfmadenewbie.com
      und fazly.app. Dazu dünn: Kosten (3 Seiten), Alter (1), Frauen (8).

      Ablauf — **nur gemessene Volumen in die CSV**, weil die Queue danach
      sortiert und eine geschätzte Zahl alles Echte überholt:
      ```
      node scripts/keyword-research.mjs --seeds scripts/keyword-gaps.txt --ideas
      node scripts/keyword-research.mjs --seeds scripts/keyword-gaps.txt --emit-csv >> apps/marketing/src/data/keywords.csv
      ```
      `scripts/keyword-gaps.txt` enthält 60 Kandidaten aus der Lückenanalyse.
      Braucht `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` in `.env.local`
      (API-Zugang von dataforseo.com, nicht der Dashboard-Login).
      `scripts/expand-clusters.mjs` ist der Altweg und baut die CSV komplett neu
      aus zwei fest verdrahteten Ubersuggest-Exporten in `~/Downloads`.
- [ ] Themenlücken: Konkurrenz-Vergleiche („vs", „alternative"), Kosten-Cluster,
      Alters-Segmente, Frauen-Zielgruppe, Before/After-Hub
- [ ] Gesichtsform-Matrizen (`haircut-*`, `glasses-*`, `beard-*` = 21 Seiten)
      differenziert generieren, sonst Near-Duplicate-Risiko
- [ ] `/about`: Gründer-/Team-Abschnitt ergänzen (E-E-A-T) — braucht deinen Input,
      wurde bewusst nicht erfunden

---

## Empfohlene Reihenfolge als nächstes

1. **GSC** → Property anlegen + Sitemap einreichen
2. **Bing** → Site hinzufügen + IndexNow einbinden
3. **Blog-Script** → Keywords-CSV + Script aufbauen
4. **Ersten Blog-Batch** generieren (10–20 Posts)
5. **PostHog** (optional) → Analytics aufsetzen
