// === series-content.js ===
// Wird auf Detail-Seiten ausgeführt (z.B. /de/series/XXX/title)
// Liest die Audio-Sprachen aus und speichert sie im Background-Storage

console.log('📄 series-content.js aktiv auf Detail-Seite');

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

// Warte auf dynamisches Laden der Seite
const MAX_WAIT_TIME = 10000;
const CHECK_INTERVAL = 500;

async function detectAndSaveLanguage() {
  console.log('🔍 Suche Audio-Sprachen auf Detail-Seite...');
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      // Audio-Sprachen Block finden
      const audioBlock = document.querySelector('[data-t="detail-row-audio-language"]');
      const descElement = audioBlock?.querySelector('[data-t="details-item-description"]');
      
      if (descElement && descElement.textContent.trim()) {
        const text = descElement.textContent.trim();
        console.log(`✅ Audio-Sprachen gefunden: "${text}"`);
        resolve(text);
      } else if (Date.now() - startTime > MAX_WAIT_TIME) {
        console.warn('⏱️ Timeout - keine Audio-Sprachen gefunden');
        resolve(null);
      } else {
        setTimeout(check, CHECK_INTERVAL);
      }
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

// Hauptfunktion
async function main() {
  console.log('\n=== series-content.js startet ===');
  
  // Warte bis Seite geladen ist
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // Serien-Info extrahieren
  const { seriesId, url, title } = getSeriesInfo();
  
  if (!seriesId) {
    console.error('❌ Keine Serien-ID gefunden!');
    return;
  }
  
  // Audio-Sprachen erkennen
  const audioText = await detectAndSaveLanguage();
  
  if (!audioText) {
    console.warn('⚠️ Konnte keine Audio-Sprachen auslesen');
    return;
  }
  
  // Sprache prüfen
  const textLower = audioText.toLowerCase();
  const hasGerman = textLower.includes('deutsch') || textLower.includes('german');
  
  console.log(`🎯 Hat Deutsch: ${hasGerman ? '✅ JA' : '❌ NEIN'}`);
  
  // Speichern
  try {
    const response = await runtime.sendMessage({
      action: 'saveLanguage',
      seriesId,
      seriesUrl: url,
      hasLanguage: hasGerman,
      language: 'deutsch',
      detectedText: audioText
    });
    
    if (response?.success) {
      console.log('✅ Erfolgreich im Storage gespeichert');
      
      // Visuelles Feedback auf der Seite
      showSaveIndicator(hasGerman);
    } else {
      console.error('❌ Speichern fehlgeschlagen:', response?.error);
    }
  } catch (error) {
    console.error('❌ Fehler beim Speichern:', error);
  }
  
  console.log('=== series-content.js fertig ===\n');
}

// Visuelles Feedback anzeigen
function showSaveIndicator(hasLanguage) {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${hasLanguage ? 'linear-gradient(135deg, #4caf50, #66bb6a)' : 'linear-gradient(135deg, #ff4e28, #ff6b4a)'};
    color: white;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    z-index: 99999;
    animation: slideIn 0.3s ease-out;
  `;
  indicator.textContent = hasLanguage 
    ? '✅ Sprache gespeichert' 
    : '❌ Keine deutsche Sprache gespeichert';
  
  // Animation hinzufügen
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);
  
  // Nach 3 Sekunden ausblenden
  setTimeout(() => {
    indicator.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      indicator.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// Starten
main().catch(console.error);
