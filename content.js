// === content.js ===
// Haupt-Script für die Popular-Page Filterung
// Läuft im Kontext der Crunchyroll-Website

// Browser-API vereinheitlichen (Firefox + Chrome)
const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

console.log('✅ Crunchyroll Language Filter gestartet');
console.log('🔧 Browser-API:', typeof browser !== 'undefined' ? 'Firefox (browser.*)' : 'Chrome (chrome.*)');

// Warte auf DOM + Lazy-Loading
const MAX_WAIT_TIME = 15000;
const CHECK_INTERVAL = 500;

// CRUNCHYROLL 2026 CARD SELECTORS (aktualisiert basierend auf DOM-Analyse)
// BEM-Naming: .browse-card, .browse-card__*, .erc-browse-cards-collection
const CARD_SELECTORS = [
  '.browse-card',                    // Haupt-Card Container (BEM)
  '[class*="browse-card"]',          // BEM-Varianten
  '.erc-show-card',                  // Legacy
  '.card-element',                   // Legacy
  '[data-testid="card"]',            // Test-ID
  '.tile-card',                      // Alternative
  '.media-card',                     // Alternative
  'article',                         // Semantic HTML
  '.show-card',                      // Generic
];

// Link-Selector für Serien-URLs
const LINK_SELECTORS = [
  'a[href*="/series"]',
  'a[href*="/watch"]',
  '.browse-card__poster-wrapper--pU-AW',  // Spezifisch für CR 2026
  'a.browse-card__poster',
  'a.card-link'
];

// Titel-Selector
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
    
    // Debug: Zeige gefundene Cards
    if (cards.length > 0) {
      console.log('📋 Erste 5 Cards:', Array.from(cards).slice(0, 5).map((c, i) => ({
        index: i,
        tag: c.tagName,
        classes: c.className?.substring(0, 100),
        hasLink: !!findLink(c)
      })));
    }
    
    if (cards.length === 0) {
      console.warn('⚠️ Keine Cards gefunden - vielleicht falsche Seite?');
      console.log('🔍 Aktuelle URL:', window.location.href);
      console.log('🔍 Verfügbare Selector testen:');
      CARD_SELECTORS.forEach(sel => {
        const count = document.querySelectorAll(sel).length;
        if (count > 0) console.log(`  ✅ ${sel}: ${count} Elemente`);
      });
      return;
    }
    
    let processed = 0;
    let hasLanguage = 0;
    let missingLanguage = 0;
    let errors = 0;
    let noLink = 0;
    
    // Jede Card analysieren
    for (const card of cards) {
      try {
        processed++;
        
        // Serien-URL aus der Card extrahieren
        const link = findLink(card);
        if (!link) {
          noLink++;
          continue;
        }
        
        let href = link.getAttribute('href');
        
        // Relative URL zu absoluter URL machen
        if (href && href.startsWith('/')) {
          href = 'https://www.crunchyroll.com' + href;
        }
        
        // Titel für Logging
        const title = findTitle(card);
        console.log(`  [${processed}/${cards.length}] 📺 Prüfe: ${title || 'Unbekannt'}`);
        
        if (!href) {
          console.log(`     ⚠️ Keine URL gefunden`);
          continue;
        }
        
        console.log(`     URL: ${href}`);
        
        // Background-Script fragt Sprache ab (CORS-frei!)
        try {
          const langResult = await runtime.sendMessage({
            action: 'checkLanguage',
            seriesUrl: href,
            targetLanguage: targetLang
          });
          
          console.log(`     Antwort Background:`, langResult);
          
          if (langResult?.error) {
            console.warn(`  ⚠️ Fehler bei ${title}: ${langResult.error}`);
            errors++;
            continue;
          }
          
          // Debug-Info vom Background-Script
          if (langResult?.debugText) {
            console.log(`     📝 Gefundener Sprach-Text (${langResult.debugMethod}): "${langResult.debugText.substring(0, 100)}"`);
          } else if (langResult?.debugText === '') {
            console.log(`     ⚠️ KEIN SPRACH-TEXT GEFUNDEN - Serie wird NICHT abgedunkelt (unsicher)`);
          }
          
          // Card entsprechend markieren
          // WICHTIG: Nur abdunkeln wenn hasLanguage === false (explizit falsch)
          // Bei null/undefined (Fehler) oder undefined (kein Text gefunden) NICHT abdunkeln!
          // Lieber sichtbar lassen als falsch abdunkeln!
          if (langResult?.hasLanguage === true) {
            hasLanguage++;
            card.classList.remove('cr-dimmed');
            card.classList.add('cr-visible');
            
            // Success-Badge hinzufügen
            addBadge(card, '✅', 'success');
            console.log(`  ✅ ${title} hat ${targetLang}`);
            
          } else if (langResult?.hasLanguage === false) {
            missingLanguage++;
            card.classList.add('cr-dimmed');
            card.classList.remove('cr-visible');
            
            // Warning-Badge hinzufügen
            addBadge(card, `❌ ${targetLang}`, 'warning');
            console.log(`  ❌ ${title} fehlt ${targetLang}`);
            
          } else {
            console.log(`  ⚠️ ${title}: Sprache nicht erkennbar (hasLanguage=${langResult?.hasLanguage})`);
          }
          
        } catch (msgError) {
          console.error(`  🚨 Message Error bei ${title}:`, msgError);
          console.error(`     Error details:`, msgError.message);
          errors++;
        }
        
      } catch (error) {
        console.error(`  🚨 Fehler bei Card ${processed}:`, error);
        errors++;
      }
    }
    
    // Zusammenfassung
    console.log(`\n📊 Filter-Ergebnis:`);
    console.log(`   Verarbeitet: ${processed}`);
    console.log(`   Mit ${targetLang}: ${hasLanguage} ✅`);
    console.log(`   Ohne ${targetLang}: ${missingLanguage} ❌`);
    console.log(`   Ohne Link: ${noLink}`);
    console.log(`   Fehler: ${errors}`);
    
    // Statistik im Storage speichern
    try {
      await storage.local.set({
        lastFilterStats: {
          date: new Date().toISOString(),
          processed,
          hasLanguage,
          missingLanguage,
          noLink,
          language: targetLang,
          errors
        }
      });
    } catch (storageError) {
      console.warn('⚠️ Konnte Stats nicht speichern:', storageError);
    }
    
  } catch (error) {
    console.error('🚨 Kritischer Fehler in filterPopularPage:', error);
  }
}

// Finde alle Cards auf der Seite
function findCards() {
  const allCards = new Set();
  
  CARD_SELECTORS.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => allCards.add(el));
    } catch (e) {
      // Invalid selector, skip
    }
  });
  
  // Filtere nur sichtbare Cards mit Mindestgröße
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
  // Fallback: irgendein Link mit /series/
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
  // Fallback: aria-label oder title-Attribut
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
  
  // Card braucht position: relative für absolute Badges
  const computedStyle = getComputedStyle(card);
  if (computedStyle.position === 'static' || computedStyle.position === '') {
    card.style.position = 'relative';
  }
  
  // Z-Index sicherstellen
  card.style.zIndex = '1';
  
  card.appendChild(badge);
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
  
  // Prüfen ob wir auf einer Listen-Seite sind
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
    console.log('ℹ️ Keine Popular-Page erkannt. Filter inaktiv.');
    console.log('   Unterstützte URLs: /popular, /videos/popular, /browse, /discover, /search, /series');
  }
}

// Starten
init();

// Bei Navigation neu starten (SPA-Support)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 URL geändert - re-initialisiere...');
    console.log('   Neue URL:', url);
    init();
  }
}).observe(document, { subtree: true, childList: true });

// Bei Page-Show (Back-Button, Reload) neu initialisieren
window.addEventListener('pageshow', (event) => {
  console.log('📄 Page-Show Event:', event.persisted ? 'aus Cache' : 'frisch geladen');
  // Kurz warten bis DOM bereit ist
  setTimeout(() => {
    console.log('🔄 Re-Initialisiere Filter nach Page-Show...');
    init();
  }, 500);
});

// Bei DOM-Reload (z.B. SPA Navigation)
document.addEventListener('readystatechange', () => {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('📄 DOM Ready State:', document.readyState);
    // Verhindern dass es zu oft feuert
    setTimeout(() => {
      const url = location.href;
      if (url.includes('/popular') || url.includes('/browse') || url.includes('/discover')) {
        console.log('🔄 Re-Initialisiere nach DOM-Ready...');
        init();
      }
    }, 1000);
  }
});
