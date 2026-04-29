// === background.js ===
// Persistent Storage für Sprach-Daten
// Da Fetch UND Iframes blockiert werden, sammeln wir Daten beim User-Besuch auf Detail-Seiten

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
const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Message Listener
const messageListener = async (request, sender, sendResponse) => {
  
  // Sprache für eine Serie speichern (von series-content.js)
  if (request.action === 'saveLanguage') {
    const { seriesId, seriesUrl, hasLanguage, language, detectedText } = request;
    
    console.log(`[Background] 💾 Speichere Sprache: ${seriesId} → ${hasLanguage ? '✅' : '❌'}`);
    
    try {
      // Hole existierende Daten
      const existing = await storage.local.get(['seriesLanguages']);
      const seriesLanguages = existing.seriesLanguages || {};
      
      // Speichere mit Timestamp
      seriesLanguages[seriesId] = {
        hasLanguage,
        language,
        detectedText,
        url: seriesUrl,
        lastUpdated: new Date().toISOString()
      };
      
      await storage.local.set({ seriesLanguages });
      console.log(`[Background] ✅ Gespeichert im Storage`);
      
      sendResponse({ success: true });
      
    } catch (error) {
      console.error('[Background] Speicher-Fehler:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true;
  }
  
  // Sprache für eine Serie abrufen (von content.js auf Popular-Page)
  if (request.action === 'getLanguage') {
    const { seriesId, seriesUrl, targetLanguage } = request;
    
    console.log(`[Background] 🔍 Suche Sprache für: ${seriesId || seriesUrl}`);
    
    try {
      const existing = await storage.local.get(['seriesLanguages', 'preferredLanguage']);
      const seriesLanguages = existing.seriesLanguages || {};
      
      // Direkt nach seriesId suchen
      if (seriesId && seriesLanguages[seriesId]) {
        const data = seriesLanguages[seriesId];
        console.log(`[Background] 📦 Gefunden im Cache: ${data.hasLanguage ? '✅' : '❌'}`);
        console.log(`[Background] 📝 Text war: "${data.detectedText}"`);
        sendResponse({ 
          hasLanguage: data.hasLanguage, 
          cached: true,
          fromStorage: true,
          detectedText: data.detectedText
        });
        return true;
      }
      
      // Fallback: Nach URL suchen
      if (seriesUrl) {
        const foundId = Object.keys(seriesLanguages).find(id => 
          seriesLanguages[id].url === seriesUrl
        );
        if (foundId) {
          const data = seriesLanguages[foundId];
          console.log(`[Background] 📦 Gefunden via URL: ${data.hasLanguage ? '✅' : '❌'}`);
          sendResponse({ 
            hasLanguage: data.hasLanguage, 
            cached: true,
            fromStorage: true,
            detectedText: data.detectedText
          });
          return true;
        }
      }
      
      // Nicht im Cache - User muss Detail-Seite besuchen
      console.log(`[Background] ⚠️ NICHT im Cache - User muss Detail-Seite besuchen`);
      sendResponse({ hasLanguage: null, cached: false, fromStorage: false });
      
    } catch (error) {
      console.error('[Background] Lese-Fehler:', error);
      sendResponse({ hasLanguage: null, error: error.message });
    }
    
    return true;
  }
  
  // Alle gespeicherten Sprachen löschen
  if (request.action === 'clearCache') {
    try {
      await storage.local.remove(['seriesLanguages']);
      console.log('[Background] 🗑️ Storage geleert');
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Background] Lösch-Fehler:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  // Statistik abrufen
  if (request.action === 'getStats') {
    try {
      const existing = await storage.local.get(['seriesLanguages']);
      const seriesLanguages = existing.seriesLanguages || {};
      const count = Object.keys(seriesLanguages).length;
      const hasLang = Object.values(seriesLanguages).filter(s => s.hasLanguage).length;
      
      console.log(`[Background] 📊 Stats: ${count} Serien, ${hasLang} mit Sprache`);
      sendResponse({ count, hasLang, missing: count - hasLang });
    } catch (error) {
      sendResponse({ count: 0, hasLang: 0, missing: 0 });
    }
    return true;
  }
  
  // Verfügbare Sprachen zurückgeben
  if (request.action === 'getAvailableLanguages') {
    sendResponse({ languages: Object.keys(LANG_MAP) });
    return true;
  }
};

if (typeof runtime !== 'undefined') {
  runtime.onMessage.addListener(messageListener);
  console.log('[Background] Storage-Handler gestartet');
  console.log('[Background] Hinweis: Sprachen werden beim Besuch von Detail-Seiten gespeichert');
}
