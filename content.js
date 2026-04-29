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

// Hauptfunktion: Filtert die Popular-Page
async function filterPopularPage() {
  console.log('🔍 Starte Filter auf Popular-Page...');
  
  try {
    // Gewünschte Sprache aus Storage laden
    const result = await storage.local.get(['preferredLanguage']);
    const targetLang = result.preferredLanguage || 'deutsch';
    
    console.log(`🎯 Zielsprache: ${targetLang}`);
    
    // Alle Serien-Cards finden
    // Diese Selector funktionieren für die meisten Crunchyroll-Layouts
    const selectors = [
      '.card-element',
      '[data-testid="card"]',
      '.erc-show-card',
      '.show-card',
      '.tile-card',
      '.media-card',
      '[class*="Card"]',
      '[class*="card"]'
    ];
    
    const cards = document.querySelectorAll(selectors.join(', '));
    console.log(`📦 ${cards.length} Cards gefunden`);
    
    // Debug: Zeige gefundene Cards
    if (cards.length > 0) {
      console.log('📋 Gefundene Cards:', Array.from(cards).map((c, i) => ({
        index: i,
        classes: c.className,
        id: c.id,
        hasLink: !!c.querySelector('a[href*="/series"]')
      })));
    }
    
    if (cards.length === 0) {
      console.warn('⚠️ Keine Cards gefunden - vielleicht falsche Seite?');
      console.log('🔍 Aktuelle URL:', window.location.href);
      console.log('🔍 Verfügbare Selector testen:');
      selectors.forEach(sel => {
        const count = document.querySelectorAll(sel).length;
        if (count > 0) console.log(`  ✅ ${sel}: ${count} Elemente`);
      });
      return;
    }
    
    let processed = 0;
    let hasLanguage = 0;
    let missingLanguage = 0;
    let errors = 0;
    
    // Jede Card analysieren
    for (const card of cards) {
      try {
        processed++;
        
        // Serien-URL aus der Card extrahieren
        const link = card.querySelector('a[href*="/series"], a[href*="/de/series"], a[href*="/en/series"]');
        if (!link) {
          console.log(`  [${processed}/${cards.length}] ⏭️ Keine Serie-URL gefunden`);
          continue;
        }
        
        let href = link.getAttribute('href');
        
        // Relative URL zu absoluter URL machen
        if (href.startsWith('/')) {
          href = 'https://www.crunchyroll.com' + href;
        }
        
        // Titel für Logging
        const title = card.querySelector('h3, h4, .title, .card-title, [class*="title"]')?.textContent?.trim() || 'Unbekannt';
        console.log(`  [${processed}/${cards.length}] 📺 Prüfe: ${title}`);
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
          
          // Card entsprechend markieren
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
    console.log(`   Fehler: ${errors}`);
    
    // Statistik im Storage speichern
    try {
      await storage.local.set({
        lastFilterStats: {
          date: new Date().toISOString(),
          processed,
          hasLanguage,
          missingLanguage,
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
  console.log(`  🏷️ Badge hinzugefügt: ${text} (${type})`);
}

// Warte-Funktion für Lazy-Loading
async function waitForCards() {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      const selectors = [
        '.card-element',
        '[data-testid="card"]',
        '.erc-show-card',
        '.show-card',
        '.tile-card',
        '.media-card'
      ];
      const cards = document.querySelectorAll(selectors.join(', '));
      
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
    console.log('   Unterstützte URLs: /popular, /videos/popular, /browse, /search, /series');
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
