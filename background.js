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
      console.log(`[Background] 📦 CACHE HIT: ${cachedResult ? '✅' : '❌'}`);
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
        
        // Versuch 1: data-t Attribute (Crunchyroll Standard)
        const audioBlock = doc.querySelector('[data-t="detail-row-audio-language"]');
        const descElement = audioBlock?.querySelector('[data-t="details-item-description"]');
        const textV1 = descElement?.textContent.toLowerCase() || '';
        
        console.log(`[Background] Methode 1 (data-t): "${textV1 || '(leer)'}"`);
        
        // Versuch 2: Alternative Selector falls data-t nicht funktioniert
        let textV2 = '';
        const altSelectors = [
          '[class*="audio"]',
          '[class*="language"]',
          '[class*="sprache"]',
          'dd:nth-of-type(4)',
          'dd:nth-of-type(5)',
          'dd:nth-of-type(6)'
        ];
        
        for (const sel of altSelectors) {
          const el = doc.querySelector(sel);
          if (el && el.textContent) {
            const text = el.textContent.toLowerCase();
            if (text.includes('deutsch') || text.includes('german') || text.includes('english') || text.includes('japan')) {
              textV2 = text;
              console.log(`[Background] Methode 2 (${sel}): "${text.substring(0, 100)}"`);
              break;
            }
          }
        }
        
        // Kombiniere beide Texte
        const fullText = textV1 || textV2;
        console.log(`[Background] 📝 Finaler Text zur Prüfung: "${fullText || '(LEER - Sprache nicht gefunden!)'}"`);
        
        // DEBUG: Zeige gesamten Text der Detail-Row
        const allDetailRows = doc.querySelectorAll('[data-t*="detail-row"]');
        console.log(`[Background] Gefundene Detail-Rows: ${allDetailRows.length}`);
        allDetailRows.forEach((row, i) => {
          const label = row.querySelector('[data-t*="label"]')?.textContent || row.querySelector('dt')?.textContent || 'N/A';
          const value = row.querySelector('[data-t*="description"]')?.textContent || row.querySelector('dd')?.textContent || 'N/A';
          console.log(`   [${i}] ${label.trim()}: ${value.trim().substring(0, 80)}`);
        });
        
        // Sprach-Check mit unserem Mapping
        const targets = LANG_MAP[targetLanguage?.toLowerCase()] || [targetLanguage?.toLowerCase()];
        const hasLanguage = fullText && targets.some(t => fullText.includes(t));
        
        console.log(`[Background] 🎯 Prüfung: Enthält "${targetLanguage}"? ${hasLanguage ? '✅ JA' : '❌ NEIN'}`);
        console.log(`[Background] Gesuchte Begriffe: ${targets.join(', ')}`);
        
        // Im Cache speichern
        languageCache.set(cacheKey, hasLanguage);
        
        console.log(`[Background] 📤 SENDE ANTORT: { hasLanguage: ${hasLanguage} }`);
        console.log(`[Background] === ENDE ANFRAGE ===\n`);
        
        sendResponse({ hasLanguage, cached: false, debugText: fullText });
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
