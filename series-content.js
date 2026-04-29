// === series-content.js ===
// Wird auf Serien-Seiten ausgeführt (z.B. /de/series/XXX/title)
// Liest die Audio-Sprachen aus und speichert sie im Background-Storage

// Browser-API sicher abrufen (Vermeidet Redeclaration wenn content.js auch lädt)
const getStorage = () => typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const getRuntime = () => typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

console.log('📄 series-content.js aktiv auf Serien-Seite');

// Längere Wartezeit für dynamisches Laden
const MAX_WAIT_TIME = 15000;
const CHECK_INTERVAL = 500;

// Audio-Sprachen mit robustem Selector finden
async function detectAudioLanguages() {
  console.log('🔍 Suche Audio-Sprachen...');
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const check = () => {
      // HAUPT-SELECTOR: data-t="detail-row-audio-language"
      const audioBlock = document.querySelector('[data-t="detail-row-audio-language"]');
      
      if (audioBlock) {
        // Versuch 1: Direkt im Block nach Text suchen
        let text = audioBlock.textContent?.trim() || '';
        
        // Versuch 2: Nach DD Element suchen (Definition List)
        if (!text || text.length < 10) {
          const ddElement = audioBlock.querySelector('dd');
          if (ddElement) {
            text = ddElement.textContent?.trim() || '';
          }
        }
        
        // Versuch 3: Nach SPAN suchen
        if (!text || text.length < 10) {
          const spanElement = audioBlock.querySelector('span');
          if (spanElement) {
            text = spanElement.textContent?.trim() || '';
          }
        }
        
        // Text bereinigen (Audio: Präfix entfernen)
        text = text.replace(/^Audio:\s*/i, '').trim();
        
        if (text && text.length > 5) {
          console.log(`✅ Audio-Sprachen gefunden: "${text}"`);
          console.log(`   Gefunden nach: ${Date.now() - startTime}ms`);
          resolve(text);
          return;
        }
      }
      
      // Timeout prüfen
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        console.warn('⏱️ Timeout - keine Audio-Sprachen gefunden');
        console.log('   Mögliche Gründe:');
        console.log('   - Seite noch nicht vollständig geladen');
        console.log('   - Crunchyroll hat die Struktur geändert');
        console.log('   - Element ist außerhalb des Viewports');
        resolve(null);
        return;
      }
      
      // Weiter warten
      setTimeout(check, CHECK_INTERVAL);
    };
    
    check();
  });
}

// Serien-ID und URL extrahieren
function getSeriesInfo() {
  const url = window.location.href;
  const pathParts = window.location.pathname.split('/');
  
  // URL Format: /de/series/{seriesId}/{title}
  const seriesId = pathParts[3];
  const title = pathParts[4]?.replace(/-/g, ' ') || 'Unknown';
  
  console.log(`📺 Serie: ${title}`);
  console.log(`   ID: ${seriesId}`);
  console.log(`   URL: ${url}`);
  
  return { seriesId, url, title };
}

// Visuelles Feedback anzeigen
function showSaveIndicator(hasLanguage, text) {
  // Existierende Indikatoren entfernen
  const existing = document.querySelector('.cr-language-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.className = 'cr-language-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${hasLanguage ? 'linear-gradient(135deg, #4caf50, #66bb6a)' : 'linear-gradient(135deg, #ff4e28, #ff6b4a)'};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    z-index: 99999;
    animation: crSlideIn 0.3s ease-out;
    max-width: 400px;
  `;
  
  const languages = text?.substring(0, 80) || '';
  indicator.innerHTML = `
    <div style="margin-bottom: 5px;">
      ${hasLanguage ? '✅' : '❌'} Sprache gespeichert
    </div>
    <div style="font-size: 12px; font-weight: normal; opacity: 0.9;">
      ${languages}${languages?.length >= 80 ? '...' : ''}
    </div>
  `;
  
  // Animation Styles hinzufügen
  if (!document.querySelector('#cr-indicator-styles')) {
    const style = document.createElement('style');
    style.id = 'cr-indicator-styles';
    style.textContent = `
      @keyframes crSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes crFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(indicator);
  
  // Nach 4 Sekunden ausblenden
  setTimeout(() => {
    indicator.style.animation = 'crFadeOut 0.3s ease-out';
    setTimeout(() => {
      indicator.remove();
    }, 300);
  }, 4000);
}

// Hauptfunktion
async function main() {
  console.log('\n=== series-content.js startet ===');
  console.log('⏰ Startzeit:', new Date().toLocaleTimeString());
  
  // Warte bis Seite geladen ist
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // Kurze Pause damit Crunchyroll Zeit hat zu laden
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Serien-Info extrahieren
  const { seriesId, url, title } = getSeriesInfo();
  
  if (!seriesId) {
    console.error('❌ Keine Serien-ID gefunden!');
    return;
  }
  
  // Audio-Sprachen erkennen (mit Wartezeit)
  const audioText = await detectAudioLanguages();
  
  if (!audioText) {
    console.warn('⚠️ Konnte keine Audio-Sprachen auslesen');
    showSaveIndicator(false, 'Keine Sprach-Infos gefunden');
    return;
  }
  
  // Sprache prüfen (auf Deutsch)
  const textLower = audioText.toLowerCase();
  const hasGerman = textLower.includes('deutsch') || textLower.includes('german');
  
  console.log(`🎯 Enthält Deutsch: ${hasGerman ? '✅ JA' : '❌ NEIN'}`);
  console.log(`   Sprachen: ${audioText}`);
  
  // Speichern
  try {
    const runtime = getRuntime();
    const response = await runtime.sendMessage({
      action: 'saveLanguage',
      seriesId,
      seriesUrl: url,
      hasLanguage: hasGerman,
      language: 'deutsch',
      detectedText: audioText
    });
    
    console.log('   Raw Response:', response);
    console.log('   Response Type:', typeof response);
    
    // Response kann boolean ODER object sein
    const success = (response === true) || (response?.success === true);
    
    if (success) {
      console.log('✅ Erfolgreich im Storage gespeichert');
      showSaveIndicator(hasGerman, audioText);
    } else {
      console.error('❌ Speichern fehlgeschlagen');
      console.log('   Response war:', response);
      showSaveIndicator(false, 'Speichern fehlgeschlagen');
    }
  } catch (error) {
    console.error('❌ Fehler beim Speichern:', error);
    console.log('   Error:', error.message);
    showSaveIndicator(false, 'Fehler: ' + error.message);
  }
  
  console.log('=== series-content.js fertig ===\n');
}

// Starten
main().catch(console.error);
