# Aura: lokaler Umbau und Inbetriebnahme

Stand: 8. Oktober 2026. App und Marketing-Website wurden nach ausdrücklicher Freigabe veröffentlicht. Der aktuelle main-Content wurde vor dem Release zusammengeführt. Live-URLs: https://app.aura-looksmaxxing.com/tools und https://www.aura-looksmaxxing.com/. Details zu Prüfungen und verbleibenden Einschränkungen stehen im Release-Protokoll am Ende. Ein echter Kauf wurde nicht ausgelöst.

## Der neue Ablauf

Artikel / Glossar / Tool-Seite → passendes öffentliches Upload-Tool → Potential-Score + gesperrte Vorschau → Anmeldung → 2,99 $ einmalig oder optionales Abo → vollständiger Bericht.

Der Browser bekommt vor der Freischaltung ausschließlich die Vorschau. Die Unschärfe verdeckt Platzhalter; bezahlte Texte werden nicht im HTML oder API-Ergebnis mitgeliefert. Gast-Berichte sind an ein HttpOnly-Cookie gebunden. Nach der Anmeldung wird der Bericht dem verifizierten Konto zugeordnet; nach der Bezahlung bleibt er über das Dashboard erreichbar.

Alle elf Tools verwenden dieselbe abgesicherte Infrastruktur, aber unterschiedliche Aufgaben und Auswertungen. Frauen-Analyse und Frauen-Frisurenberatung berücksichtigen Styling-Wünsche. Der Planner enthält Wochenaufgaben, eine lokale Checkliste und PDF-Druck. Der Fotovergleich verlangt zwei Fotos. Frisurenempfehlungen liefern einen Salon-Brief; generierte Try-on-Bilder sind weiterhin eine separate App-Funktion. Die Tools liefern KI-Einschätzungen, keine kalibrierten anatomischen Messungen.

Die bestehenden Produkt-IDs bleiben erhalten: aura_starter_pack (5 Credits für 2,99 $), aura_monthly und aura_yearly. Die Freischaltung eines neuen Tool-Berichts kostet 5 Credits. Der Anmeldebonus von 2 Credits plus ein Starter-Pack ermöglichen damit genau einen neuen Tool-Bericht; die verbleibenden 2 Credits reichen nicht für einen zweiten. Alte Face-Scan-Freischaltungen behalten ihren bisherigen Preis von 3 Credits. Einmalzahlung ist die primäre Option; bestehende bezahlte Credits werden zuerst geprüft und erst nach ausdrücklichem Klick verbraucht. Monatliche Credit-Erneuerung ist auch für Jahresabos implementiert.

Monatsabo: 9,99 $; Jahresabo: 49,99 $. Beide liefern 100 Credits pro Monat, also bis zu 20 Tool-Berichte oder eine Mischung mit Try-ons zu 2 Credits. Unverbrauchte Monatscredits verfallen beim monatlichen Reset. Diese Bedingungen stehen auch in App-Preisen, Onboarding und Checkout-Auswahl. Das Abo wird nach der Anmeldung optional im aufklappbaren Bereich und nach der Freischaltung als dezenter Verweis auf die Pläne angeboten. Neue Analysen aus dem Dashboard führen ebenfalls in den öffentlichen Tool-Ablauf; bestehende Scan-Ergebnisse bleiben erreichbar.

## GPT-6 Luna

`apps/web/lib/ai-model.ts` setzt zentral `gpt-6-luna` für Tool-Berichte, bestehende Face-Scan-API und den Coach. `reasoning_effort: none` behält die bisherige Kosten-/Latenzklasse bei. Foto-Berichte verwenden JSON-Modus; abgeschnittene Antworten, Refusals und leere Antworten werden nicht als fertige Berichte akzeptiert. Der gemeinsame Tool-Pfad behält 2.600 Ausgabetokens als Obergrenze.

Der bestehende Proxy reicht den Request-Body unverändert an Chat Completions weiter. Lokal wurde sein Quellcode geprüft; zusätzlich hat ein echter Request über die bestehende Proxy-URL Modell `gpt-6-luna`, gültiges JSON und `finish_reason: stop` zurückgegeben (30 Input-, 11 Output-, 0 Reasoning-Tokens). Das bestätigt Transport, Bildannahme und JSON-Ausgabe; es ersetzt keine Qualitätsbewertung von Gesichtsberichten.

Optionale Server-Variablen: `FACE_ANALYSIS_MODEL=gpt-6-luna`, `AI_CHAT_MODEL=gpt-6-luna`, bestehendes `FACE_ANALYSIS_URL`, optional separates `AI_CHAT_URL`. Ohne Modell-Variablen gilt Luna. Für einen ausdrücklichen Rollback pro Aufgabe kann `gpt-4.1-mini` gesetzt werden; es gibt keinen automatischen zweiten kostenpflichtigen Fallback-Aufruf. Vorhandene Berichte werden nicht neu analysiert. Der Laufzeit-API-Key bleibt im Proxy.

Quellen: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [offizielle OpenAI-Migrationshinweise](https://developers.openai.com/api/docs/guides/latest-model).

## Lokal ansehen

- Marketing: http://127.0.0.1:4322/
- Tools: http://127.0.0.1:3101/tools
- Frauen-Upload: http://127.0.0.1:3101/tools/face-analysis-for-women
- Gesperrte Designvorschau: http://127.0.0.1:3101/tools/preview
- Freigeschaltete Designvorschau: http://127.0.0.1:3101/tools/preview?state=unlocked

Die Designvorschauen enthalten fiktive Beispieldaten, deaktivierte Interaktionen und sind nur im Development-Modus erreichbar. Sie rufen keine KI auf und erzeugen keine Berichte in Firebase.

Startbefehle aus dem Repository:

```powershell
pnpm --filter @saas-template/web exec next dev --port 3101 --hostname 127.0.0.1
$env:PUBLIC_APP_URL='http://127.0.0.1:3101'
pnpm --filter marketing exec astro dev --port 4322 --host 127.0.0.1
```

Den zweiten Befehlssatz in einem zweiten Terminal starten.

## Content-Pipeline

Nachbesserung vom 10. Oktober 2026: Die ausgefallenen Themen `best-glasses-for-round-face` und `haircuts-for-round-faces-women` wurden mit echter Recherche, Opus-Artikeln, Textprüfung und je drei GPT-Image-2.5-Bildern nachgeholt. Quellenbelege und missverständliche Grafiken wurden vor Freigabe korrigiert. Die letzten erfolgreichen Textprüfungen kosteten rechnerisch $0,021276 beziehungsweise $0,019704 statt zuvor rund $0,13 pro Versuch. Drei bestandene Bildprüfungen kommen auf etwa $0,014 dazu. Das sind Token-Schätzungen je erfolgreichem Prüfdurchgang; Recherche, Schreiben, Bilderstellung, Wiederholungen und Steuern sind zusätzlich. Alle Versuche bleiben im Prüfprotokoll sichtbar.

Validiert: 39 Offline-Tests einschließlich Abbruch/Wiederaufnahme, Sperre bereits veröffentlichter Slugs und Bild-Cache-Integrität; echter Negativtest mit erfundener medizinischer Quellenbehauptung abgelehnt; 153 öffentliche Seiten gebaut. Beide neuen Artikel haben korrektes Canonical und Article-Schema, erscheinen im Blog und in der Sitemap, verwenden passende Tool-Links und insgesamt sechs freigegebene 1024×1024-WebP-Bilder. Die tägliche Queue enthält anschließend 139 weitere automatisch bearbeitbare Themen.

1. Veröffentlichte Slugs werden nicht überschrieben. Ein einzelner Review-Entwurf kann ausdrücklich mit `--retry-review --slug SLUG` fortgesetzt werden. Neue Tool-Seiten dürfen nur für tatsächlich implementierte Tools entstehen.
2. Recherche mit Websuche und echten Quellenzitaten; höchstens drei Suchaufrufe.
3. Artikel: weiterhin Claude Opus 5.5, konfigurierbar über CONTENT_MODEL oder --model. Vor der Prüfung werden Markdown mit `draft: true` und Original-JSON einschließlich Bildbriefings und Quellenbelegen unter `content-reviews/drafts/SLUG.json` gespeichert. Die JSON-Datei bleibt als Wiederaufnahmepunkt erhalten.
4. Strukturelle Prüfung: Quellen aus der Recherche, korrekte Slang-Begriffe, passende Tool-Links, ausreichender Inhalt, unterschiedliche Bildbriefings, keine rohen HTML-Injektionen.
5. Zweite redaktionelle Prüfung mit Sonnet 5.5: `effort: low`, adaptive Denkphase und maximal 4.096 Ausgabetokens. Sie erhält den Artikel, den Produktumfang und die vollständigen zitierten Quellenausschnitte, jedoch keinen Such-/Thinking-Verlauf. Ausgabe ausschließlich Freigabe und höchstens sechs konkrete blockierende Fehler. Fokus: erfundene Quellenbelege, wesentliche Falschaussagen, Produkt-/Medizinversprechen und unpassende Inhalte/Bildbriefings. Geschmacksfragen sind kein Ablehnungsgrund. Unvollständige oder ungültige Antworten geben einen Artikel niemals frei. Die Variante ohne Denkphase lieferte im Praxistest widersprüchliche Urteile und wird deshalb für Text nicht eingesetzt.
6. Bilder: fal-Endpunkt openai/gpt-image-2.5/flare/text-to-image, quality=low, width=1024, height=1024. Drei Bilder pro Blogartikel, jeweils mit eigenem Zweck. Speicherung als WebP. Neue Hero-Bilder behalten ihr quadratisches Format.
7. Jedes erzeugte Bild wird visuell gegen sein Briefing geprüft; der Alt-Text beschreibt das tatsächlich sichtbare Bild. Diese Prüfung verwendet `effort: medium`, `thinking: between_tools` und maximal 1.000 Ausgabetokens. Bereits freigegebene Bilder werden bei Wiederaufnahme ohne erneute Kosten verwendet, aber nur wenn Bilddatei, Briefing, Artikelposition und Modellkonfiguration unverändert sind. SHA-256 und Prüfprotokoll werden unter `content-reviews/images/` gespeichert. Änderungen oder fehlende Nachweise erzwingen eine neue Erstellung und Prüfung.
8. Fehlgeschlagene Prüfungen und medizinische Eingriffsthemen bleiben als Entwurf stehen. Auch Fehler vor dem ersten speicherbaren Entwurf erhalten einen Review-Bericht mit Fehlerursache und den CSV-Status review. Status und Bericht werden selbst dann gespeichert und im automatischen Lauf committed, wenn kein Artikel erzeugt wurde. So wird dasselbe gescheiterte Thema nicht täglich kostenpflichtig wiederholt. Review-Berichte stehen unter content-reviews/. Drafts fehlen im öffentlichen Build und bei internen Related-Links.
9. Ein erfolgreicher Marketing-Build ist Pflicht vor Commit/Push. CI-Fehler und Entwürfe werden als Fehler sichtbar, nicht still als Erfolg quittiert.

Ein Drittel der Kalendertage priorisiert Frauen-Themen, wenn passende Themen anstehen. Produktnahe Haar-, Gesichtsform- und Planner-Themen kommen vor rein volumengetriebenen Slang-Artikeln. Sechs neue Frauen-Themen sind eingeplant; Suchvolumen wurde dafür nicht erfunden.

Bestehende Artikeltexte, Titel und URLs wurden nicht automatisch neu geschrieben. CTA-Karten und allgemeine App-Links werden im Template/Markdown-Renderer passend zum Thema ergänzt beziehungsweise umgeleitet, vorerst nur auf den fünf unten aufgeführten Pilotseiten. Die neue Qualitätskontrolle ersetzt keine nachträgliche Prüfung alter Texte: zum Beispiel die überzogenen Körperfett-Ziele im Frauen-Artikel und die falsche MTN/HTN-Deutung in älteren Inhalten gehören in eine gezielte redaktionelle Überarbeitung.

## Begrenzter CTA-Test auf Bestandsseiten

Die Auswahl liegt zentral in `config/content-cta-rollout.mjs`. Der Test ist seit der Veröffentlichung am 8. Oktober aktiv; es gibt keine automatische Erweiterung oder Zeitsteuerung.

| Seite | Passendes Tool | Grund für die Auswahl |
| --- | --- | --- |
| /blog/looksmaxxing-for-women | face-analysis-for-women | Starker Artikel aus der Search Console, Frauen-Zielgruppe |
| /blog/looksmaxxing-tips-and-checklist | psl-score-calculator | Starker Artikel aus der Search Console, Suchintention Bewertung |
| /blog/haircut-for-face-shape | haircut-recommendation-tool | Konkrete Produktnähe; keine Traffic-Stärke unterstellt |
| /glossary/htn | ai-face-rating | Starkes Glossar aus der Search Console |
| /glossary/htb-ltb-mtb | face-analysis-for-women | Starkes Glossar aus der Search Console, Frauen-Suchintention |

Auf den drei Blogseiten erscheint die kompakte Karte nach der vollständigen Einleitung und vor der ersten Abschnittsüberschrift, die zweite Karte am Ende. Fehlt eine abtrennbare Einleitung, entfällt die frühe Karte. Die beiden Glossarseiten erhalten nur die Karte am Ende. Alles wird bereits beim Build gerendert, ohne nachträgliches Verschieben im Browser. Artikel bleiben frei lesbar.

Alle anderen Bestandsseiten behalten ihre bisherigen allgemeinen CTA-Blöcke und unveränderten App-Links im Artikeltext. Auch neue Artikel werden nicht automatisch in den Template-Test aufgenommen; die neue Pipeline kann in neuen Texten weiterhin kontextuelle Tool-Links schreiben. Der größere Umbau von Startseite, Navigation, Preisgestaltung und Tool-Seiten ist unabhängig von dieser Begrenzung. Es handelt sich um einen beobachteten Rollout nach Seiten, nicht um einen randomisierten A/B-Test.

Vor der Veröffentlichung 28 Tage Ausgangsdaten sichern: GSC-Klicks, Impressionen, CTR und Position je Pilot-URL und wichtiger Suchanfrage, getrennt nach Gerät und Land, soweit das Volumen reicht. Vergleichbare, unveränderte Seiten als Referenz auswählen. Veröffentlichungstag notieren; keine künstlich neuen Publikationsdaten setzen.

Nach der Veröffentlichung zunächst 2–4 Wochen beobachten. In PostHog kennzeichnet `cta_rollout=article-tool-cta-v1` Klicks auf die neuen Karten und umgeleiteten allgemeinen Textlinks. `page`, `tool` und `placement` trennen Quelle und Position (`article-after-intro`, `article-end`, `blog-inline`, `glossary-end`, `glossary-inline`). Je URL Artikelaufrufe → CTA-Klicks → Uploads → Vorschauen → bestätigte Käufe auswerten; Käufe über serverseitige Zahlungsereignisse bestätigen. Kleine Stichproben nicht als belastbaren Sieger interpretieren.

Erst bei ausreichenden Daten und ohne auffällige Verschlechterung der Suchleistung weitere passende URLs in die Liste aufnehmen. Bei Problemen einzelne URLs aus der Liste nehmen und neu bauen; damit kehren auch die bisherigen Textlink-Ziele und End-CTAs zurück. Änderungen an Text, Titel, Bildern oder URL während dieses CTA-Tests vermeiden, damit die Beobachtung nachvollziehbar bleibt.

```powershell
# Vollständig offline: keine API-Aufrufe und keine Dateischreibvorgänge
pnpm content:preview

# Kostenpflichtiger Generierungslauf, schreibt ausschließlich lokal
node scripts/generate-content.mjs --count 1 --types blog --no-git

# Einen fehlgeschlagenen Artikel fortsetzen; vorhandener JSON-Entwurf spart Recherche/Writer
node scripts/generate-content.mjs --slug SLUG --retry-review --no-git
```

--dry-run ist wirklich offline. --no-images erzwingt für bebilderte Formate einen Entwurf. Der tägliche Workflow nutzt den auf main veröffentlichten Stand. Die manuelle Workflow-Ausführung bietet zusätzlich `retry_review` zusammen mit einem konkreten `slug`.

Ein Entwurf wird nach Prüfung überarbeitet: konkrete Beanstandungen aus content-reviews abarbeiten, den Artikel unter `data` im JSON-Wiederaufnahmepunkt korrigieren, Quellen und Bildbriefings prüfen und anschließend `--retry-review --slug SLUG` ausführen. Die Pipeline prüft den korrigierten Entwurf erneut und erzeugt erst nach bestandenem Textcheck die Bilder. Markdown-Änderungen allein werden bei dieser Wiederaufnahme nicht übernommen. Klinische Themen brauchen weiterhin eine menschliche Freigabe. Die gespeicherte automatische Prüfhistorie ist keine Garantie für medizinische oder wissenschaftliche Richtigkeit.

Falls noch kein Entwurf gespeichert werden konnte: Ursache im Review-JSON beheben und denselben expliziten Retry-Befehl verwenden. Nur in diesem Fall werden Recherche und Artikel erneut erzeugt. Existiert Markdown ohne JSON-Wiederaufnahmepunkt, stoppt die Pipeline zum Schutz des Entwurfs. Frühere Prüfberichte und Kosten bleiben unter `previousAttempts` erhalten. Der Tageslauf überspringt Review-Themen weiterhin, damit kein kostenpflichtiger Wiederholungszyklus entsteht. Die aktuelle Zahl neuer Themen liefert `pnpm content:preview`.

## Modelle und Kosten

Opus 5.5 war bereits eingestellt. Es entsteht durch Beibehaltung des Schreibmodells kein Modellwechsel-Aufpreis; Recherche und zusätzliche Prüfungen sind neue Arbeitsschritte. Die Pipeline protokolliert Tokens und geschätzte Textkosten pro Schritt.

Verifizierte Listenpreise zum Implementierungszeitpunkt: Opus 5.5 4 $ / 1 Mio. Input-Tokens und 20 $ / 1 Mio. Output-Tokens, Sonnet 5.5 2 $ / 10 $. Beispiel eines einzelnen Schreibaufrufs mit 5.000 Input- und 8.000 Output-Tokens: 0,18 $ statt 0,09 $, also 2,70 $ Differenz für 30 solche Aufrufe. Denken zählt zum Output. Recherche, Review, Websuche und Bilder sind zusätzlich.

Quellen:
- [Anthropic-Modellpreise](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic-Websuche](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [fal GPT Image 2.5 Flare API](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image/api)
- [OpenAI Images API](https://developers.openai.com/api/reference/resources/images/methods/generate)

Die neue Bildkonfiguration ist implementiert und mit isolierten Tests geprüft. Provider-Verfügbarkeit, tatsächlich erzeugte Bildqualität und abgerechnete Kosten müssen beim ersten freigegebenen Generierungslauf bestätigt werden. Es wurden keine alten Bilder ungeprüft massenhaft ersetzt.

## Vor einer späteren Veröffentlichung

Ursprüngliche Checkliste; der tatsächliche Umsetzungsstatus nach Veröffentlichung steht im folgenden Release-Protokoll.

1. Aktuellen main-Stand inklusive automatisch hinzugekommener Inhalte mit diesem lokalen Branch zusammenführen. Keinen älteren kompletten Content-Stand über die Live-Seite kopieren.
2. In der Web-Umgebung TOOL_REPORT_SECRET (mindestens 32 zufällige Zeichen) sicher setzen. Lokal wurde ein eigener Schlüssel in der ignorierten apps/web/.env.local angelegt. Für bestehende Berichte muss der Produktionsschlüssel erhalten bleiben; ein Wechsel macht sie unlesbar. APP_ORIGIN muss exakt der App-Origin entsprechen; PUBLIC_APP_URL muss auf dieselbe Umgebung zeigen.
3. Firebase-Regeln überprüfen und die serverseitige Zugriffsgrenze durchsetzen. firestore.rules enthält eine Deny-all-Regel für Browserzugriffe, passend zur Admin-SDK-Architektur dieses Web-Repositories. Vor Anwendung abgleichen, ob andere Apps dasselbe Firebase-Projekt direkt nutzen. Auf keinen Fall öffentliche Schreibrechte auf users, credits, subscriptions, Berichte oder Zahlungsereignisse lassen.
4. Firestore-TTL für expiresAt in private_tool_reports und private_tool_limits aktivieren. Die API verweigert abgelaufene Berichte schon unabhängig vom Cleanup. Unbezahlte Vorschauen: 24 Stunden als Gast, 7 Tage nach Konto-Zuordnung; freigeschaltete Berichte haben keine automatische Ablaufzeit.
5. RevenueCat: bestehende Offering-IDs und den echten Checkout-Preis des Starter Packs (2,99 $) prüfen. REVENUECAT_WEBHOOK_SECRET muss dem konfigurierten Authorization-Header exakt entsprechen. Der Webhook lehnt fehlende Konfiguration ab und quittiert fehlgeschlagene Gutschriften mit einem wiederholbaren Fehler.
6. Einen isolierten Sandbox-Durchlauf mit Testkonto prüfen: Upload → Registrierung → abgebrochener Checkout → erfolgreicher Checkout → Webhook → entsperrter Bericht → Neuladen → zweiter Login. Sandboxzahlungen in Produktion werden standardmäßig ignoriert; ALLOW_SANDBOX_PAYMENTS nur in einer gezielt eingerichteten Testumgebung einschalten.
7. Einen freigegebenen Artikel samt drei Bildern generieren und redaktionell ansehen. Dafür müssen Anthropic-Websuche, Modelle und fal-Endpunkt im Konto verfügbar sein.
8. App-Funnel zuerst erreichbar machen, anschließend Marketing-CTAs veröffentlichen. Dann die ersten echten Zahlungseingänge mit den Konto-Credits und Reports abgleichen.

## Ziel: ein Käufer pro Tag

Der Zielwert ist ein eindeutiger zahlender Nutzer pro Kalendertag; Verlängerungen werden gesondert gezählt. Der Server speichert bestätigte Käufe in tool_funnel_events, statt einen Browser-Checkout-Klick als Umsatz zu behandeln.

```powershell
# Read-only Abfrage der konfigurierten Firebase-Umgebung; nicht für die Tests ausgeführt
node scripts/funnel-report.mjs --days 28
```

Die Ausgabe enthält Tageszahlen in Europe/Berlin, Umsatz aus bestätigten Produktionskäufen, neue Käufer und freigeschaltete Berichte. Es gibt keinen historischen Backfill. Bruttoumsatz ist vor Refunds, Gebühren und Steuern. Last-tool-Quelle dient zur Orientierung und ist keine exakte Mehrkanal-Attribution.

PostHog-Ereignisse: cta_click → tool_upload_started → tool_preview_created → tool_preview_viewed → tool_unlock_clicked → signup → checkout_started → tool_report_unlocked. purchase_completed im Browser ist nur Checkout-Telemetrie; tatsächliche Käufe werden serverseitig ausgewertet. Fotos, Präferenzen und Berichtstexte gehören nicht in Analytics. Session-Recording und Autocapture sind im App-Client deaktiviert.

Planungsbeispiel, kein Benchmark: 200 Besucher/Tag × 8 % Tool-Klicks × 50 % Uploads × 12,5 % Käufe nach Vorschau = 1 Kauf/Tag. Zuerst messen, wo Nutzer aussteigen. Bei 30 Einzelkäufen zu 2,99 $ wären das 89,70 $ Monatsbruttoumsatz; mehr Umsatz erfordert mehr Käufe, passende Abos oder einen höheren Warenkorb.

Nach den ersten 14 Tagen: erst die drei größten Abbruchstellen verbessern. Frauen-Analyse, Frisurenberatung und Planner getrennt auswerten. Für größere monetäre Ziele danach einen sinnvollen Planner-/Frisuren-Bundle testen. Affiliate-Empfehlungen passen später zu tatsächlich relevanten Haar-/Pflegeprodukten, mit transparentem Hinweis und ohne erfundene Produkttests. Anzeigen sind bei diesem Traffic und dem unmittelbaren Produktziel zunächst nachrangig. Ein separates Fitnessprodukt benötigt eigenen Inhalt und eine klare Zielgruppe; es wird nicht aus einem Gesichtsbild abgeleitet.

## Validierung

- Isolierte Tests: Vorschau-Redaktion, Kontozuordnung, Verschlüsselung und ID-Bindung, Ablaufzeiten, parallele Quoten, idempotente Entsperrung, Webhook-Wiederholungen, fehlgeschlagene Gutschriften, Credit-Rennen, Jahresabo-Monatsgrenzen, passende Frauen-CTAs, Quellen- und Bildprüfungen.
- Next.js-TypeScript-Prüfung sowie Produktionsbuild.
- Astro-Produktionsbuild und Sichtprüfung der Artikel-Verlinkung.
- Browserprüfung der öffentlichen Uploads, mobilen Darstellung sowie fiktiver gesperrter/freigeschalteter Berichte.
- 30 isolierte Tests bestanden, einschließlich Luna-Anfrageparametern, explizitem Rollback, Bildreihenfolge, abgelehnten/unvollständigen KI-Antworten, 5-Credit-Freischaltung und persistierten Fehlerstatus der Content-Queue.
- TypeScript-Prüfung, Next.js-Produktionsbuild und Astro-Produktionsbuild mit 136 Seiten bestanden. Bestehende Blog-/Glossar-Quelldateien unverändert.
- Vor dem Release: echter Luna-Verbindungstest mit künstlichem Bild bestanden. Die anschließenden Live-Prüfungen und Grenzen sind unten dokumentiert.

## Release-Protokoll vom 8. Oktober 2026

- Release-Branch: `release/aura-tool-funnel-20261008`; enthält den bisherigen Umbau sowie `origin/main` bis `6bad108c52af114d76a120997a6d3ae1c5a9f649`. Neuere automatisch erzeugte Artikel und Bilder wurden erhalten. Die ursprüngliche Arbeitskopie mit ihren lokalen Änderungen wurde nicht zurückgesetzt.
- App zuerst veröffentlicht: `dpl_4Z84dHK7XYeidQyJfzGBFPSEquDH`. Marketing anschließend: `dpl_HBCttxA7xxNG6o9HSm9cXtPUZDYs`. Spätere Git-Deployments desselben finalen Releases ersetzen diese IDs.
- Vercel: frischer Produktionsschlüssel `TOOL_REPORT_SECRET`, `CRON_SECRET`, App-Origin, Luna-Modelle und Tageslimit gesetzt; fehlenden fal-Schlüssel ergänzt. Bestehende Firebase- und RevenueCat-Konfiguration erhalten. Keine Schlüssel im Git-Repository.
- Firestore: vorhandene Regeln vorab gesichert und serverseitige Zugriffsgrenze veröffentlicht. Das Projekt enthält nur die Web-App. Beide Billing-Pläne auf `monthly_credits: 100` korrigiert; beim Jahresplan das falsche Feld `thly_credits` entfernt. Zwei bestehende aktuelle Abos auf die monatliche Erneuerung vorbereitet, ohne Guthaben zurückzusetzen.
- Firestore-TTL ist im aktuellen Firebase-Projekt wegen deaktiviertem Billing nicht verfügbar. Statt eines Tarifwechsels läuft täglich um 03:00 UTC `/api/cron/tool-cleanup` über Vercel. Der Job ist mit einem Bearer-Secret geschützt und entfernt abgelaufene Vorschauen und Quoten. Transaktionen lesen vor dem Löschen erneut, damit gleichzeitige Zuordnungen und Freischaltungen erhalten bleiben. API-Ablaufzeiten gelten weiterhin sofort. Vercel bestätigt den aktiven Zeitplan; der erste geplante Lauf stand beim Release noch aus.
- RevenueCat-Produkte mit dem tatsächlich ausgelieferten öffentlichen App-Schlüssel gelesen: Starter-Pack 2,99 USD, monatlich 9,99 USD, jährlich 49,99 USD. Offering enthält alle drei IDs. Der lokale RevenueCat-Schlüssel und das lokale Webhook-Secret sind veraltet; die bestehenden Produktionswerte wurden nicht ersetzt. Ein erfolgreicher echter Checkout samt Webhook und Freischaltung wurde nicht ausgeführt.
- Live geprüft: Tools und Frauen-/Planner-Uploads erreichbar; Formular im Browser kontrolliert. Ungültige Eingaben werden mit 400, fremde Origins mit 403, fremde Berichte mit 404 und unautorisierte Webhook-/Cleanup-Aufrufe mit 401 abgewiesen. Ein künstliches rotes PNG durchlief Produktions-API, Firebase-Quota und Luna und wurde korrekt mit 422 als ungeeignetes Foto zurückgewiesen. Die Development-Ergebnisvorschau zeigt in Produktion die 404-Ansicht.
- Website: Startseite, Tools, Preise, alle fünf CTA-Pilotseiten, ein neuer Artikel aus main und Sitemap mit 200 geprüft. Richtige Tool-Ziele und Canonical-URLs, keine localhost-Links. Bestehende Blog-/Glossartexte bleiben gegenüber dem aktuellen main erhalten.
- 32 isolierte Tests und TypeScript-Prüfung bestanden; Next.js-Produktionsbuild bei Vercel erfolgreich, Astro baut 151 öffentliche Seiten.
- Echter Content-Probelauf: Recherche und Opus-Artikel ausgeführt. Der erste Versuch erreichte das bisherige Ausgabelimit; der Writer nutzt jetzt Streaming, mittleren Aufwand und maximal 24.000 Ausgabetokens. Auch abgebrochene Antworten werden künftig in der Kostenübersicht erfasst. Der nächste vollständige Entwurf wurde wegen einer Quelle außerhalb der verifizierten Recherche als `draft: true` zurückgehalten. Der Writer erhält jetzt zusätzlich die explizite URL-Freigabeliste. Keine automatische Umgehung der Quellenprüfung. Der Entwurf und die Prüfberichte liegen im Repository; er wird weder gebaut noch wiederholt kostenpflichtig generiert. 141 neue Blog-/Glossarseiten bleiben in der Queue.
- Separater echter Bildtest bestanden: `openai/gpt-image-2.5/flare/text-to-image`, `quality=low`, Ausgabe exakt 1024 × 1024; WebP-Konvertierung sowie visuelle Sonnet-Prüfung erfolgreich. Das Brillen-Motiv wurde zusätzlich angesehen. Der Test ersetzt keinen vollständigen Artikel mit drei geprüften Bildern; der zurückgehaltene Entwurf wurde nicht mit Testbildern veröffentlicht.
- PostHog ist in beiden Produktionsprojekten mangels Schlüssel nicht aktiviert. Serverseitige Kauf- und Tool-Ereignisse in Firestore funktionieren unabhängig davon; die vollständige Auswertung von Artikelaufrufen und CTA-Klicks braucht noch einen PostHog-Projektschlüssel. Es wurde kein neues Analytics-Konto angelegt.
- Offene manuelle Validierung: ein echter Kauf mit anschließendem Neuladen des freigeschalteten Berichts sowie Qualitätsbewertung mit geeigneten, freigegebenen Gesichts-Testfotos. Es wurden keine Kundendaten für diese Prüfungen verwendet.
