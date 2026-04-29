// === debug-selectors.js ===
// Debug-Script um die richtigen Card-Selector zu finden
// In der Firefox Console auf der Popular-Page ausführen

(function() {
  console.log('🔍 Crunchyroll Card-Selector Debugger gestartet');
  console.log('📄 Aktuelle URL:', window.location.href);
  
  // Alle möglichen Selector testen
  const testSelectors = [
    // Standard
    '.card-element',
    '[data-testid="card"]',
    '.erc-show-card',
    '.show-card',
    '.tile-card',
    '.media-card',
    
    // Crunchyroll-spezifisch
    '[class*="card"]',
    '[class*="Card"]',
    '[class*="show"]',
    '[class*="Show"]',
    '[class*="tile"]',
    '[class*="Tile"]',
    '[class*="media"]',
    '[class*="Media"]',
    
    // Container
    '.container',
    '[class*="container"]',
    '[class*="grid"]',
    '[class*="list"]',
    
    // Links
    'a[href*="/series"]',
    'a[href*="/watch"]',
    
    // Bilder (oft in Cards)
    'img[src*="crunchyroll"]',
    '[class*="thumbnail"]',
    '[class*="image"]',
  ];
  
  console.log('\n📋 Selector Test-Ergebnisse:');
  console.log('========================');
  
  const results = [];
  testSelectors.forEach(sel => {
    try {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        results.push({ selector: sel, count: elements.length });
        console.log(`✅ ${sel}: ${elements.length} Elemente`);
        
        // Erstes Element detailliert zeigen
        if (elements.length > 0) {
          const el = elements[0];
          console.log('   └─ Tag:', el.tagName);
          console.log('   └─ Classes:', el.className);
          console.log('   └─ ID:', el.id || '(keine)');
          console.log('   └─ Data-Attributes:', Object.keys(el.dataset || {}));
          
          // Hat die Card einen Serien-Link?
          const link = el.querySelector('a[href*="/series"]') || el.querySelector('a');
          if (link) {
            console.log('   └─ Link:', link.getAttribute('href'));
          }
          
          // Hat die Card einen Titel?
          const title = el.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
          if (title) {
            console.log('   └─ Titel:', title.textContent?.trim().substring(0, 50));
          }
        }
      }
    } catch (e) {
      console.log(`❌ ${sel}: Fehler - ${e.message}`);
    }
  });
  
  if (results.length === 0) {
    console.warn('\n⚠️ Keine Cards mit Standard-Selector gefunden!');
    console.log('🔍 Manuelle Inspektion empfohlen:');
    console.log('   1. F12 → Inspector Tab');
    console.log('   2. Eine Serien-Card auswählen');
    console.log('   3. Klassen-Namen notieren');
  }
  
  // Alternative: Alle Container mit vielen Kindern finden
  console.log('\n🔍 Alternative: Große Container suchen...');
  const allElements = document.querySelectorAll('*');
  const containers = Array.from(allElements).filter(el => {
    return el.children.length >= 5 && 
           el.offsetWidth > 200 && 
           ['DIV', 'SECTION', 'UL', 'OL'].includes(el.tagName);
  });
  
  console.log(`📦 ${containers.length} potenzielle Container gefunden`);
  containers.slice(0, 5).forEach((container, i) => {
    console.log(`\n[Container ${i + 1}]`);
    console.log('   Tag:', container.tagName);
    console.log('   Classes:', container.className);
    console.log('   ID:', container.id || '(keine)');
    console.log('   Kinder:', container.children.length);
    console.log('   Erste Kinder-Tags:', Array.from(container.children).slice(0, 5).map(c => c.tagName));
  });
  
  // Return für weitere Verarbeitung
  return { results, containers };
})();
