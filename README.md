# 🎌 Crunchyroll Language Filter v2.0

Eine Browser-Erweiterung für Crunchyroll, die Serien auf der **Popular-Page** nach Audiosprache filtert und Serien ohne gewünschte Sprache **abdunkelt**.

## ✨ Features

- 🔍 **Popular-Page Filter**: Automatische Erkennung und Markierung von Serien
- 🌐 **Mehrsprachigkeit**: Unterstützt 11+ Sprachen (Deutsch, Englisch, Französisch, Japanisch, etc.)
- 🎨 **Visuelles Feedback**: Abdunklung + Badges (✅/❌) für jede Serie
- ⚡ **CORS-frei**: Background-Script umgeht Browser-Sicherheitsbeschränkungen
- 💾 **Smart Caching**: Vermeidet doppelte Requests für gleiche Serien
- 📱 **Manifest V3**: Aktuellster Extension-Standard (Chrome/Edge kompatibel)

## 🚀 Installation

### Chrome/Edge/Brave

1. **Extension laden:**
   ```bash
   # Browser öffnen
   chrome://extensions/
   
   # "Entwicklermodus" aktivieren (oben rechts)
   # "Entpackte Erweiterung laden" klicken
   # Verzeichnis auswählen: /path/to/crunchyroll_filter
   ```

2. **Extension testen:**
   - Crunchyroll öffnen: https://www.crunchyroll.com/de/videos/popular
   - Extension-Icon klicken und Sprache wählen
   - Die Seite wird automatisch gefiltert

### Firefox

> ⚠️ Firefox benötigt Manifest V2. Für Firefox-Kompatibilität siehe `manifest.json` Kommentare.

## 📖 Verwendung

1. **Sprache wählen:**
   - Auf das Extension-Icon klicken
   - Gewünschte Sprache auswählen (z.B. 🇩🇪 Deutsch)
   - Einstellung wird automatisch gespeichert

2. **Popular-Page öffnen:**
   - Navigiere zu `/videos/popular` oder `/browse`
   - Der Filter startet automatisch
   - Serien ohne Sprache werden abgedunkelt

3. **Filter-Ergebnis:**
   - ✅ **Grünes Badge**: Serie hat gewünschte Sprache
   - ❌ **Rotes Badge**: Serie fehlt gewünschte Sprache (abgedunkelt)
   - Hover über abgedunkelte Cards zeigt Vorschau

## 🛠️ Technische Details

### Architektur

```
┌─────────────────────────────────────────────────────┐
│                 Crunchyroll Website                  │
│  ┌──────────────────────────────────────────────┐   │
│  │            content.js (Popular-Page)         │   │
│  │  • Findet alle Serien-Cards                  │   │
│  │  • Sendet Sprache-Anfrage an Background      │   │
│  │  • Fügt CSS-Klassen + Badges hinzu           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          ↕ (chrome.runtime.sendMessage)
┌─────────────────────────────────────────────────────┐
│              background.js (Service Worker)          │
│  • Empfängt Sprache-Anfragen                        │
│  • Lädt Serien-Seite (CORS-frei!)                   │
│  • Parst [data-t="detail-row-audio-language"]       │
│  • Cached Ergebnis für Session                      │
│  • Sendet Ergebnis zurück                           │
└─────────────────────────────────────────────────────┘
                          ↕ (chrome.storage.local)
┌─────────────────────────────────────────────────────┐
│                popup.js (Einstellungen)              │
│  • Sprachauswahl UI                                 │
│  • Speichert preferredLanguage                      │
│  • Zeigt Filter-Statistik                           │
│  • Cache-Management                                 │
└─────────────────────────────────────────────────────┘
```

### Sprach-Erkennung

Die Extension verwendet ein **wartbares Mapping-System** für Sprachen:

```javascript
const LANG_MAP = {
  'deutsch': ['deutsch', 'german', 'de', 'ger'],
  'englisch': ['english', 'en', 'eng'],
  'français': ['français', 'french', 'fr'],
  // ... 11+ Sprachen
};
```

**Vorteile:**
- ✅ Keine Slug-Hardcoding
- ✅ Einfach neue Sprachen hinzufügen
- ✅ Unterstützt ISO-639-Codes + lokale Namen
- ✅ Skalierbar für weitere Sprachen

### CORS-Umgehung

Das **Background-Script** kann CORS-freie Requests machen:

```javascript
// background.js (Service Worker)
fetch(seriesUrl)  // ✅ Erlaubt für Extensions
  .then(r => r.text())
  .then(html => parseLanguage(html));
```

**Warum das funktioniert:**
- Extensions haben spezielle Permissions (`host_permissions`)
- Background-Scripts unterliegen nicht dem gleichen CORS-Policy
- Keine Iframes oder Proxy-Server nötig

## 📁 Dateistruktur

```
crunchyroll_filter/
├── manifest.json       # Extension-Konfiguration (V3)
├── background.js       # Service Worker für CORS-freie Requests
├── content.js          # Haupt-Logik für Popular-Page
├── style.css           # CSS für Abdunklung + Badges
├── popup.html          # Einstellungs-UI
├── popup.js            # Popup-Logik
├── popup.css           # Popup-Styling
└── icons/
    └── icon48.png      # Extension-Icon
```

## 🔧 Entwicklung

### Debugging

1. **Content-Script Logs:**
   ```
   F12 → Console Tab → Filter: "Crunchyroll"
   ```

2. **Background-Script Logs:**
   ```
   chrome://extensions/ → "Service Worker" neben Extension
   ```

3. **Popup Logs:**
   ```
   Popup rechtsklicken → "Untersuchen"
   ```

### Testing

```bash
# 1. Extension im Browser laden (siehe Installation)
# 2. Crunchyroll Popular-Page öffnen
# 3. Console-Logs beobachten
# 4. Verschiedene Sprachen testen
```

### Build für Production

```bash
# ZIP für Chrome Web Store erstellen
cd crunchyroll_filter
zip -r ../crunchyroll-filter-v2.zip * -x "*.git*"
```

## 🐛 Bekannte Probleme

| Problem | Workaround | Status |
|---------|------------|--------|
| Lazy-Loading bei vielen Serien | Scrollen für vollständige Analyse | ⚠️ In Arbeit |
| Sehr langsame Verbindung | Timeout kann erhöht werden | 🔧 Configurable |
| Andere Sprach-URLs (/en/, /fr/) | Slug-Erkennung erweitern | 📝 TODO |

## 📝 Changelog

### v2.0 (2026-04-29)
- ✅ **Manifest V3** Support
- ✅ **Background-Script** für CORS-freie Requests
- ✅ **11+ Sprachen** mit wartbarem Mapping
- ✅ **Smart Caching** vermeidet doppelte Requests
- ✅ **Visuelle Badges** (✅/❌) für jede Serie
- ✅ **Verbessertes CSS** mit Hover-Effekten
- ✅ **Popup-Statistik** zeigt letzte Filter-Ergebnisse

### v1.0 (vorherige Version)
- ⚠️ Nur Detail-Seiten Support
- ⚠️ Iframe-basiert (oft blockiert)
- ⚠️ Kein CSS-Dimming
- ⚠️ Manifest V2 (veraltet)

## 🤝 Contributing

Pull Requests sind willkommen! Besonders:
- 🌍 Weitere Sprachen hinzufügen
- 🎨 UI-Verbesserungen
- ⚡ Performance-Optimierungen
- 🧪 Test-Cases

## 📄 Lizenz

MIT License - siehe LICENSE Datei

## 💡 Tipps

- **Cache leeren** bei Sprachwechsel für frische Ergebnisse
- **Hover über abgedunkelte Cards** für bessere Sicht
- **Extension aktiv lassen** für automatisches Filtern

---

**Viel Spaß beim Filtern!** 🎌✨

*Bei Fragen oder Problemen einfach ein Issue eröffnen.*
