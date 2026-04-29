// === background.js ===
// CORS-freie Requests für Sprachprüfung
// Wird als Background-Script ausgeführt (Manifest V2 für Firefox)

const languageCache = new Map(); // Session-Cache für wiederholte Anfragen

// Sprach-Mapping mit ISO-639-Codes und Varianten
// Einfach neue Sprachen hier hinzufügen - wartbar und skalierbar!
const LANG_MAP = {
  'deutsch': ['deutsch', 'german', 'de', 'ger'],
  'englisch': ['english', 'en', 'eng'],
  'français': ['français', 'french', 'fr'],
  'japanisch': ['japanese', 'ja', 'jap', 'japanisch'],
  'spanisch': ['español', 'spanish', 'es', 'spa'],
  'portugiesisch': ['português', 'portuguese', 'pt', 'por'],
  'italienisch': ['italiano', 'italian', 'it', 'ita'],
  'russisch': ['russian', 'русский', 'ru', 'rus'],
  'arabisch': ['arabic', 'العربية', 'ar', 'ara'],
  'koreanisch': ['korean', '한국어', 'ko', 'kor'],
  'chinesisch': ['chinese', '中文', 'zh', 'chi', 'mandarin']
};

// Browser-API vereinheitlichen (Firefox uses browser.*, Chrome uses chrome.*)
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Message Listener für Sprach-Anfragen
const messageListener = (request, sender, sendResponse) => {
  if (request.action === 'checkLanguage') {
    const { seriesUrl, targetLanguage } = request;
    
    console.log(`\n[Background] === NEUE ANFRAGE ===`);
    console.log(`[Background] URL: ${seriesUrl}`);
    console.log(`[Background] Zielsprache: ${targetLanguage}`);
    
    // Cache prüfen (vermeidet doppelte Requests)
    const cacheKey = `${seriesUrl}:${targetLanguage}`;
    if (languageCache.has(cacheKey)) {
      const cachedResult = languageCache.get(cacheKey);
      console.log(`[Background] 📦 CACHE HIT: ${cachedResult ? '✅ HAT Sprache' : '❌ FEHLT Sprache'}`);
      return sendResponse({ hasLanguage: cachedResult, cached: true });
    }
    
    console.log(`[Background] 🌐 Lade Serie...`);
    
    // Serie im Background laden (CORS-frei dank Extension!)
    fetch(seriesUrl, {
      headers: {
        'User-Agent': navigator.userAgent,
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
      .then(response => {
        console.log(`[Background] HTTP Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(html => {
        console.log(`[Background] HTML empfangen: ${html.length} Bytes`);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // DEBUG: Zeige alle möglichen Sprach-Elemente
        console.log(`[Background] 🔍 Suche nach Sprach-Elementen...`);
        
        // CRUNCHYROLL 2026: Verschiedene Selector testen
        let foundText = '';
        let foundMethod = '';
        
        // Methode 1: data-t Attribute (Crunchyroll Standard)
        const audioBlockV1 = doc.querySelector('[data-t="detail-row-audio-language"]');
        const descV1 = audioBlockV1?.querySelector('[data-t="details-item-description"]');
        if (descV1 && descV1.textContent.trim()) {
          foundText = descV1.textContent.trim().toLowerCase();
          foundMethod = 'data-t (audio-language)';
        }
        
        // Methode 2: Nach Text "Audio" oder "Sprache" suchen
        if (!foundText) {
          const allLabels = Array.from(doc.querySelectorAll('dt, [class*="label"], [data-t*="label"]'));
          for (const label of allLabels) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes('audio') || labelText.includes('sprache') || labelText.includes('language')) {
              // Nächstes dd Element ist der Wert
              const valueEl = label.nextElementSibling;
              if (valueEl && valueEl.tagName === 'DD') {
                foundText = valueEl.textContent.trim().toLowerCase();
                foundMethod = 'Label/Value Pair';
                break;
              }
            }
          }
        }
        
        // Methode 3: Alle dd Elemente durchsuchen (oft Audio-Sprachen in dd)
        if (!foundText) {
          const allDDs = doc.querySelectorAll('dd');
          for (const dd of allDDs) {
            const text = dd.textContent.toLowerCase();
            if (text.includes('deutsch') || text.includes('german') || text.includes('english') || text.includes('japanese')) {
              foundText = text;
              foundMethod = 'dd Element Scan';
              break;
            }
          }
        }
        
        // Methode 4: Meta-Tags prüfen
        if (!foundText) {
          const metaLang = doc.querySelector('meta[name="language"], meta[property="og:language"]');
          if (metaLang) {
            foundText = metaLang.getAttribute('content')?.toLowerCase() || '';
            foundMethod = 'Meta Tag';
          }
        }
        
        console.log(`[Background] Methode 1 (data-t): "${descV1?.textContent.trim() || '(leer)'}"`);
        console.log(`[Background] 📝 Gefundener Text: "${foundText || '(KEIN TEXT GEFUNDEN!)'}"`);
        console.log(`[Background] 📋 Gefunden mit: ${foundMethod || 'KEINE METHODE ERFOLGREICH'}`);
        
        // DEBUG: Zeige gesamten Text der Detail-Rows
        const allDetailRows = doc.querySelectorAll('[data-t*="detail-row"], dl, .details-row');
        console.log(`[Background] Gefundene Detail-Rows: ${allDetailRows.length}`);
        allDetailRows.forEach((row, i) => {
          if (i < 8) { // Max 8 Zeilen um Console nicht zu fluten
            const label = row.querySelector('[data-t*="label"], dt, [class*="label"]')?.textContent || 'N/A';
            const value = row.querySelector('[data-t*="description"], dd, [class*="value"]')?.textContent || 'N/A';
            console.log(`   [${i}] ${label.trim().substring(0, 30)}: ${value.trim().substring(0, 60)}`);
          }
        });
        
        // Sprach-Check mit unserem Mapping
        // WICHTIG: Nur als "hat Sprache" wenn Text NICHT leer ist UND Sprache enthält
        const targets = LANG_MAP[targetLanguage?.toLowerCase()] || [targetLanguage?.toLowerCase()];
        
        let hasLanguage = false;
        if (foundText && foundText.length > 0) {
          hasLanguage = targets.some(t => foundText.includes(t));
          console.log(`[Background] 🎯 Prüfung: "${targetLanguage}" in "${foundText.substring(0, 50)}"?`);
          console.log(`[Background] Gesuchte Begriffe: ${targets.join(', ')}`);
          targets.forEach(t => {
            if (foundText.includes(t)) {
              console.log(`[Background]   ✅ TREFFER: "${t}"`);
            }
          });
        } else {
          console.log(`[Background] ⚠️ KEIN SPRACH-TEXT GEFUNDEN - kann nicht prüfen!`);
        }
        
        console.log(`[Background] 🎯 Ergebnis: ${hasLanguage ? '✅ HAT Sprache' : '❌ FEHLT Sprache (oder nicht gefunden)'}`);
        
        // Im Cache speichern
        languageCache.set(cacheKey, hasLanguage);
        
        console.log(`[Background] 📤 SENDE ANTORT: { hasLanguage: ${hasLanguage} }`);
        console.log(`[Background] === ENDE ANFRAGE ===\n`);
        
        sendResponse({ 
          hasLanguage, 
          cached: false, 
          debugText: foundText,
          debugMethod: foundMethod
        });
      })
      .catch(error => {
        console.error('[Background] ❌ FEHLER:', error.message);
        console.error('[Background] Stack:', error.stack);
        sendResponse({ error: error.message, hasLanguage: null });
      });
    
    return true; // Wichtig für async response!
  }
  
  // Cache leeren (z.B. bei Sprachwechsel)
  if (request.action === 'clearCache') {
    languageCache.clear();
    console.log('[Background] Cache geleert');
    sendResponse({ success: true });
    return true;
  }
  
  // Verfügbare Sprachen zurückgeben
  if (request.action === 'getAvailableLanguages') {
    sendResponse({ languages: Object.keys(LANG_MAP) });
    return true;
  }
};

// Listener registrieren (Firefox + Chrome kompatibel)
if (typeof runtime !== 'undefined') {
  runtime.onMessage.addListener(messageListener);
  console.log('[Background] Script gestartet und bereit für Anfragen');
}

// Für Firefox Manifest V2: Event-Listener für Installation
if (typeof runtime !== 'undefined' && runtime.onInstalled) {
  runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installiert/aktualisiert');
  });
}
