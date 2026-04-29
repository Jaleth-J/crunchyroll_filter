// === content.js ===
// Haupt-Script für die Popular-Page Filterung
// Liest Sprach-Daten aus dem persistenten Storage

// Browser-API vereinheitlichen (Firefox + Chrome)
const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

console.log('✅ Crunchyroll Language Filter gestartet');
console.log('🔧 Browser-API:', typeof browser !== 'undefined' ? 'Firefox (browser.*)' : 'Chrome (chrome.*)');

// Warte auf DOM + Lazy-Loading
const MAX_WAIT_TIME = 15000;
const CHECK_INTERVAL = 500;

// CRUNCHYROLL 2026 CARD SELECTORS (aktualisiert basierend auf DOM-Analyse)
const CARD_SELECTORS = [
  '.browse-card',
  '[class*="browse-card"]',
  '.erc-show-card',
  '.card-element',
  '[data-testid="card"]',
  '.tile-card',
  '.media-card',
  'article',
  '.show-card',
];

const LINK_SELECTORS = [
  'a[href*="/series"]',
  'a[href*="/watch"]',
  '.browse-card__poster-wrapper--pU-AW',
  'a.browse-card__poster',
  'a.card-link'
];

const TITLE_SELECTORS = [
  '.browse-card__title',
  '.card-title',
  '.title',
  'h3', 'h4', 'h5',
  '[class*="title"]',
  '[class*="name"]'
];

// Hauptfunktion: Filtert die Popular-Page
async function filterPopularPage() {
  console.log('🔍 Starte Filter auf Popular-Page...');
  
  try {
    // Gewünschte Sprache aus Storage laden
    const result = await storage.local.get(['preferredLanguage']);
    const targetLang = result.preferredLanguage || 'deutsch';
    
    console.log(`🎯 Zielsprache: ${targetLang}`);
    
    // Alle Serien-Cards finden
    const cards = findCards();
    console.log(`📦 ${cards.length} Cards gefunden`);
    
    if (cards.length === 0) {
      console.warn('⚠️ Keine Cards gefunden');
      return;
    }
    
    let processed = 0;
    let hasLanguage = 0;
    let missingLanguage = 0;
    let notInCache = 0;
    
    // Jede Card analysieren
    for (const card of cards) {
      try {
        processed++;
        
        // Serien-URL und ID extrahieren
        const link = findLink(card);
        if (!link) continue;
        
        let href = link.getAttribute('href');
        if (href && href.startsWith('/')) {
          href = 'https://www.crunchyroll.com' + href;
        }
        
        // Serien-ID aus URL extrahieren
        const seriesId = extractSeriesId(href);
        const title = findTitle(card) || 'Unbekannt';
        
        console.log(`  [${processed}/${cards.length}] 📺 ${title}`);
        
        // Sprache aus Storage abrufen
        const langResult = await runtime.sendMessage({
          action: 'getLanguage',
          seriesId,
          seriesUrl: href,
          targetLanguage: targetLang
        });
        
        if (langResult?.error) {
          console.warn(`     ⚠️ Fehler: ${langResult.error}`);
          continue;
        }
        
        // Ergebnis verarbeiten
        if (langResult?.fromStorage) {
          // Im Cache gefunden!
          console.log(`     📦 Cache: ${langResult.hasLanguage ? '✅ HAT' : '❌ FEHLT'} ${targetLang}`);
          if (langResult.detectedText) {
            console.log(`     📝 Text: "${langResult.detectedText.substring(0, 60)}"`);
          }
          
          if (langResult.hasLanguage === true) {
            hasLanguage++;
            addBadge(card, '✅', 'success');
            console.log(`     ✅ ${title} hat ${targetLang}`);
            
          } else if (langResult.hasLanguage === false) {
            missingLanguage++;
            addBadge(card, `❌ ${targetLang}`, 'warning');
            console.log(`     ❌ ${title} fehlt ${targetLang}`);
            
          }
          
        } else {
          // NICHT im Cache - User muss Detail-Seite besuchen
          notInCache++;
          console.log(`     ⚠️ NICHT im Cache - Besuche Detail-Seite!`);
          addBadge(card, '❓', 'unknown');
        }
        
      } catch (error) {
        console.error(`  🚨 Fehler bei Card ${processed}:`, error);
      }
    }
    
    // Zusammenfassung
    console.log(`\n📊 Filter-Ergebnis:`);
    console.log(`   Verarbeitet: ${processed}`);
    console.log(`   Mit ${targetLang}: ${hasLanguage} ✅`);
    console.log(`   Ohne ${targetLang}: ${missingLanguage} ❌`);
    console.log(`   Nicht im Cache: ${notInCache} ❓`);
    console.log(`\n💡 Tipp: Klicke auf Serien mit ❓ um die Sprache zu speichern!`);
    
    // Statistik speichern
    await storage.local.set({
      lastFilterStats: {
        date: new Date().toISOString(),
        processed,
        hasLanguage,
        missingLanguage,
        notInCache,
        language: targetLang
      }
    });
    
  } catch (error) {
    console.error('🚨 Kritischer Fehler:', error);
  }
}

// Serien-ID aus URL extrahieren
function extractSeriesId(url) {
  // Format: https://www.crunchyroll.com/de/series/{seriesId}/title
  const match = url.match(/\/series\/([A-Z0-9]+)\//i);
  return match ? match[1] : null;
}

// Finde alle Cards auf der Seite
function findCards() {
  const allCards = new Set();
  
  CARD_SELECTORS.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => allCards.add(el));
    } catch (e) {
      // Invalid selector
    }
  });
  
  // Filtere nur sichtbare Cards
  return Array.from(allCards).filter(card => {
    const rect = card.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100;
  });
}

// Finde Link in einer Card
function findLink(card) {
  for (const selector of LINK_SELECTORS) {
    const link = card.querySelector(selector);
    if (link && link.getAttribute('href')) {
      return link;
    }
  }
  return card.querySelector('a[href*="/series"]');
}

// Finde Titel in einer Card
function findTitle(card) {
  for (const selector of TITLE_SELECTORS) {
    const el = card.querySelector(selector);
    if (el && el.textContent?.trim()) {
      return el.textContent.trim().substring(0, 50);
    }
  }
  const link = findLink(card);
  if (link) {
    return link.getAttribute('aria-label') || link.getAttribute('title');
  }
  return null;
}

// Badge zu einer Card hinzufügen
function addBadge(card, text, type) {
  // Existierendes Badge entfernen
  const existingBadge = card.querySelector('.cr-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  // Neues Badge erstellen
  const badge = document.createElement('span');
  badge.className = `cr-badge cr-${type}`;
  badge.textContent = text;
  
  // Position sicherstellen
  const computedStyle = getComputedStyle(card);
  if (computedStyle.position === 'static' || computedStyle.position === '') {
    card.style.position = 'relative';
  }
  
  card.style.zIndex = '1';
  
  // Inline-Styles für Abdunklung (nicht vererbbar!)
  if (type === 'warning') {
    card.style.opacity = '0.25';
    card.style.filter = 'grayscale(85%) brightness(0.5)';
    card.style.transition = 'all 0.3s ease';
  } else if (type === 'success') {
    card.style.opacity = '1';
    card.style.filter = 'none';
  } else if (type === 'unknown') {
    card.style.opacity = '0.6';
    card.style.filter = 'grayscale(30%)';
  }
  
  card.appendChild(badge);
  console.log(`     🏷️ Badge: ${text} (${type})`);
}

// Warte-Funktion für Lazy-Loading
async function waitForCards() {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      const cards = findCards();
      
      if (cards.length > 0) {
        console.log(`✅ ${cards.length} Cards gefunden nach ${Date.now() - startTime}ms`);
        resolve(cards);
      } else if (Date.now() - startTime > MAX_WAIT_TIME) {
        console.warn('⏱️ Timeout - keine Cards gefunden');
        reject(new Error('Timeout: Keine Cards gefunden'));
      } else {
        setTimeout(check, CHECK_INTERVAL);
      }
    };
    
    check();
  });
}

// Auto-Start auf Popular-Page
function init() {
  const url = window.location.href;
  
  console.log('🔍 URL geprüft:', url);
  
  const isPopularPage = url.includes('/popular') || 
                        url.includes('/videos/popular') ||
                        url.includes('/browse') ||
                        url.includes('/discover') ||
                        url.includes('/search') ||
                        url.includes('/series');
  
  if (isPopularPage) {
    console.log('📄 Popular-Page erkannt - starte Filter...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        waitForCards().then(filterPopularPage).catch(console.error);
      });
    } else {
      waitForCards().then(filterPopularPage).catch(console.error);
    }
  } else {
    console.log('ℹ️ Keine Popular-Page erkannt');
  }
}

// Starten
init();

// Bei Navigation neu starten
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 URL geändert - re-initialisiere...');
    init();
  }
}).observe(document, { subtree: true, childList: true });

// Bei Page-Show (Back-Button, Reload)
window.addEventListener('pageshow', (event) => {
  console.log('📄 Page-Show:', event.persisted ? 'aus Cache' : 'frisch');
  setTimeout(() => init(), 500);
});
