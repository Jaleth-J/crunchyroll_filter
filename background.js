// === background.js ===
// Iframe-basierte Sprach-Prüfung für Crunchyroll
// Da Fetch blockiert wird, nutzen wir versteckte Iframes

const languageCache = new Map();
const pendingRequests = new Map(); // Track aktive Iframe-Requests

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

const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

// Message Listener
const messageListener = (request, sender, sendResponse) => {
  if (request.action === 'checkLanguage') {
    const { seriesUrl, targetLanguage } = request;
    const cacheKey = `${seriesUrl}:${targetLanguage}`;
    
    console.log(`\n[Background] === ANFRAGE ===`);
    console.log(`[Background] URL: ${seriesUrl}`);
    console.log(`[Background] Sprache: ${targetLanguage}`);
    
    // Cache prüfen
    if (languageCache.has(cacheKey)) {
      const result = languageCache.get(cacheKey);
      console.log(`[Background] 📦 CACHE: ${result ? '✅' : '❌'}`);
      return sendResponse({ hasLanguage: result, cached: true });
    }
    
    // Prüfen ob bereits Anfrage läuft
    if (pendingRequests.has(cacheKey)) {
      console.log(`[Background] ⏳ Warte auf laufende Anfrage...`);
      setTimeout(() => {
        if (languageCache.has(cacheKey)) {
          sendResponse({ hasLanguage: languageCache.get(cacheKey), cached: true });
        } else {
          sendResponse({ hasLanguage: null, cached: false });
        }
      }, 2000);
      return true;
    }
    
    pendingRequests.set(cacheKey, true);
    
    // Iframe-Methode: Serie in verstecktem Iframe laden
    console.log(`[Background] 🖼️ Erstelle Iframe...`);
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.src = seriesUrl;
    
    const timeout = setTimeout(() => {
      console.log(`[Background] ⏱️ TIMEOUT (10s)`);
      if (iframe.parentNode) iframe.remove();
      pendingRequests.delete(cacheKey);
      sendResponse({ hasLanguage: null, cached: false, timeout: true });
    }, 10000);
    
    iframe.onload = () => {
      console.log(`[Background] ✅ Iframe geladen`);
      
      // Warte auf dynamisches Laden der Seite
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          // Sprach-Information suchen
          const audioBlock = iframeDoc.querySelector('[data-t="detail-row-audio-language"]');
          const descElement = audioBlock?.querySelector('[data-t="details-item-description"]');
          const text = descElement?.textContent.toLowerCase() || '';
          
          console.log(`[Background] 📝 Text: "${text || '(leer)'}"`);
          
          // Sprach-Prüfung
          const targets = LANG_MAP[targetLanguage?.toLowerCase()] || [targetLanguage?.toLowerCase()];
          const hasLanguage = text && targets.some(t => text.includes(t));
          
          console.log(`[Background] 🎯 Ergebnis: ${hasLanguage ? '✅ HAT' : '❌ FEHLT'}`);
          
          languageCache.set(cacheKey, hasLanguage);
          pendingRequests.delete(cacheKey);
          
          clearTimeout(timeout);
          if (iframe.parentNode) iframe.remove();
          
          sendResponse({ hasLanguage, cached: false, debugText: text });
          
        } catch (parseError) {
          console.error('[Background] Parse-Fehler:', parseError);
          clearTimeout(timeout);
          if (iframe.parentNode) iframe.remove();
          pendingRequests.delete(cacheKey);
          sendResponse({ hasLanguage: null, error: parseError.message });
        }
      }, 2000); // Warte auf dynamisches Laden
    };
    
    iframe.onerror = () => {
      console.error('[Background] Iframe Lade-Fehler');
      clearTimeout(timeout);
      if (iframe.parentNode) iframe.remove();
      pendingRequests.delete(cacheKey);
      sendResponse({ hasLanguage: null, error: 'Iframe failed' });
    };
    
    document.body.appendChild(iframe);
    console.log(`[Background] Iframe hinzugefügt`);
    
    return true;
  }
  
  if (request.action === 'clearCache') {
    languageCache.clear();
    pendingRequests.clear();
    console.log('[Background] Cache geleert');
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getAvailableLanguages') {
    sendResponse({ languages: Object.keys(LANG_MAP) });
    return true;
  }
};

if (typeof runtime !== 'undefined') {
  runtime.onMessage.addListener(messageListener);
  console.log('[Background] Iframe-Handler gestartet');
}
