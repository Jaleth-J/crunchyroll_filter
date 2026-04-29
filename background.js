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
    
    // Cache prüfen (vermeidet doppelte Requests)
    const cacheKey = `${seriesUrl}:${targetLanguage}`;
    if (languageCache.has(cacheKey)) {
      console.log(`[Cache Hit] ${seriesUrl} → ${languageCache.get(cacheKey)}`);
      return sendResponse({ hasLanguage: languageCache.get(cacheKey), cached: true });
    }
    
    console.log(`[Background] Prüfe Sprache für: ${seriesUrl} (${targetLanguage})`);
    
    // Serie im Background laden (CORS-frei dank Extension!)
    fetch(seriesUrl, {
      headers: {
        'User-Agent': navigator.userAgent,
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Sprach-Block finden
        const audioBlock = doc.querySelector('[data-t="detail-row-audio-language"]');
        const descElement = audioBlock?.querySelector('[data-t="details-item-description"]');
        const text = descElement?.textContent.toLowerCase() || '';
        
        console.log(`[Background] Gefundener Text: "${text}"`);
        
        // Sprach-Check mit unserem Mapping
        const targets = LANG_MAP[targetLanguage?.toLowerCase()] || [targetLanguage?.toLowerCase()];
        const hasLanguage = targets.some(t => text.includes(t));
        
        // Im Cache speichern
        languageCache.set(cacheKey, hasLanguage);
        
        console.log(`[Background] Ergebnis: ${hasLanguage ? '✅' : '❌'} ${targetLanguage}`);
        sendResponse({ hasLanguage, cached: false });
      })
      .catch(error => {
        console.error('[Background] Fehler:', error);
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
  console.log('[Background] Service Worker installiert');
}

// Für Firefox Manifest V2: Event-Listener für Installation
if (typeof runtime !== 'undefined' && runtime.onInstalled) {
  runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installiert/aktualisiert');
  });
}
