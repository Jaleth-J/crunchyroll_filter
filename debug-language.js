// === debug-language.js ===
// Debug-Script um Sprach-Informationen auf Serien-Seiten zu finden
// In der Console auf einer Serien-Seite ausführen (z.B. /de/series/XXX/title)

(function() {
  console.log('🔍 Crunchyroll Language Debug - Start');
  console.log('📄 URL:', window.location.href);
  console.log('⏰ Startzeit:', new Date().toLocaleTimeString());
  
  const results = {
    selectors: [],
    possibleElements: [],
    fullText: []
  };
  
  // 1. Alle data-t Attribute finden
  console.log('\n=== 1. data-t Attribute ===');
  const allDataT = document.querySelectorAll('[data-t]');
  console.log(`📊 ${allDataT.length} Elemente mit data-t gefunden`);
  
  const audioRelated = Array.from(allDataT).filter(el => {
    const dataT = el.getAttribute('data-t');
    return dataT?.toLowerCase().includes('audio') || 
           dataT?.toLowerCase().includes('language') ||
           dataT?.toLowerCase().includes('sprache');
  });
  
  audioRelated.forEach((el, i) => {
    const dataT = el.getAttribute('data-t');
    const text = el.textContent?.trim() || '(kein Text)';
    console.log(`   [${i}] data-t="${dataT}" → "${text.substring(0, 100)}"`);
    results.selectors.push({ type: 'data-t', attribute: dataT, text });
  });
  
  // 2. Alle dt/dd Paare finden (Definition Lists)
  console.log('\n=== 2. dt/dd Paare (Definition Lists) ===');
  const dls = document.querySelectorAll('dl');
  console.log(`📊 ${dls.length} dl-Elemente gefunden`);
  
  dls.forEach((dl, i) => {
    const dts = dl.querySelectorAll('dt');
    const dds = dl.querySelectorAll('dd');
    
    dts.forEach((dt, j) => {
      const label = dt.textContent?.trim() || '';
      const dd = dds[j];
      const value = dd?.textContent?.trim() || '';
      
      if (label.toLowerCase().includes('audio') || 
          label.toLowerCase().includes('sprache') ||
          label.toLowerCase().includes('language') ||
          value.toLowerCase().includes('deutsch') ||
          value.toLowerCase().includes('german')) {
        console.log(`   [dl-${i}] ${label}: ${value.substring(0, 100)}`);
        results.possibleElements.push({ type: 'dl', label, value });
      }
    });
  });
  
  // 3. Alle Elemente mit "Audio", "Sprache", "Language" im Text
  console.log('\n=== 3. Text-Suche nach "Audio/Sprache/Language" ===');
  const allElements = document.querySelectorAll('*');
  let foundCount = 0;
  
  allElements.forEach(el => {
    const text = el.textContent?.trim() || '';
    if (text.length > 5 && text.length < 500 &&
        (text.toLowerCase().includes('deutsch') ||
         text.toLowerCase().includes('german') ||
         text.toLowerCase().includes('japanese') ||
         text.toLowerCase().includes('english'))) {
      
      if (foundCount < 20) { // Max 20 Ergebnisse
        const tag = el.tagName;
        const classes = el.className?.toString().substring(0, 80) || '';
        const id = el.id || '';
        console.log(`   <${tag}${id ? ' id="'+id+'"' : ''}${classes ? ' class="'+classes+'"' : ''}>`);
        console.log(`      "${text.substring(0, 150)}"`);
        results.fullText.push({ tag, classes, id, text });
      }
      foundCount++;
    }
  });
  console.log(`📊 Insgesamt ${foundCount} Elemente mit Sprach-Text gefunden`);
  
  // 4. Meta-Tags prüfen
  console.log('\n=== 4. Meta-Tags ===');
  const metas = document.querySelectorAll('meta');
  metas.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
    const content = meta.getAttribute('content') || '';
    if (name.toLowerCase().includes('language') || content.toLowerCase().includes('deutsch')) {
      console.log(`   meta[${name}="${content}"]`);
    }
  });
  
  // 5. JSON-LD / Structured Data
  console.log('\n=== 5. JSON-LD / Structured Data ===');
  const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLd.forEach((script, i) => {
    try {
      const data = JSON.parse(script.textContent);
      const text = JSON.stringify(data).toLowerCase();
      if (text.includes('deutsch') || text.includes('german') || text.includes('language')) {
        console.log(`   [${i}] JSON-LD enthält Sprach-Info`);
        console.log(`      ${JSON.stringify(data).substring(0, 200)}...`);
      }
    } catch (e) {
      // Invalid JSON
    }
  });
  
  // 6. API Calls im Network Tab finden (Hinweis für User)
  console.log('\n=== 6. Network Tab Hinweis ===');
  console.log('💡 Öffne F12 → Network Tab → Filter: "api" oder "json"');
  console.log('   Suche nach Requests die Sprach-Informationen enthalten könnten');
  console.log('   Oft sind Daten in API-Responses die nicht im DOM sind');
  
  // Zusammenfassung
  console.log('\n=== ZUSAMMENFASSUNG ===');
  console.log(`data-t Elemente: ${results.selectors.length}`);
  console.log(`dl/dd Paare: ${results.possibleElements.length}`);
  console.log(`Elemente mit Sprach-Text: ${results.fullText.length}`);
  
  if (results.selectors.length === 0 && results.possibleElements.length === 0) {
    console.warn('⚠️ KEINE Sprach-Informationen im DOM gefunden!');
    console.log('💡 Mögliche Gründe:');
    console.log('   1. Seite noch nicht vollständig geladen (dynamisches Loading)');
    console.log('   2. Sprach-Info ist nur in API-Response (nicht im DOM)');
    console.log('   3. Crunchyroll hat die Struktur geändert');
    console.log('\n💡 Nächste Schritte:');
    console.log('   1. Seite neu laden und Script nochmal ausführen');
    console.log('   2. F12 → Network Tab → API-Requests prüfen');
    console.log('   3. Screenshot vom Inspector teilen');
  }
  
  // Copy-paste freundliche Ausgabe
  console.log('\n=== COPY-PASTE FÜR DEVELOPER ===');
  console.log('Gefundene Selector:');
  results.selectors.forEach(s => console.log(`  [data-t="${s.attribute}"]`));
  results.possibleElements.forEach(p => console.log(`  dt:contains("${p.label}") + dd`));
  
  return results;
})();
