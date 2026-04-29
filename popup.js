// === popup.js ===
// Popup-Logik für die Extension-Einstellungen

document.addEventListener('DOMContentLoaded', async () => {
  const languageSelect = document.getElementById('language-select');
  const currentLangDisplay = document.getElementById('current-lang');
  const lastFilterDisplay = document.getElementById('last-filter');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  const reloadPageBtn = document.getElementById('reload-page-btn');
  const statusSection = document.getElementById('status-section');

  // Gewählte Sprache laden und anzeigen
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['preferredLanguage', 'lastFilterStats']);
      
      // Sprache im Select setzen
      const preferredLang = result.preferredLanguage || 'deutsch';
      languageSelect.value = preferredLang;
      currentLangDisplay.textContent = getLanguageEmoji(preferredLang) + ' ' + preferredLang;
      
      // Filter-Statistik anzeigen
      if (result.lastFilterStats) {
        const stats = result.lastFilterStats;
        const date = new Date(stats.date).toLocaleString('de-DE');
        lastFilterDisplay.textContent = `${date} (${stats.processed} geprüft, ${stats.hasLanguage} ✅)`;
      } else {
        lastFilterDisplay.textContent = 'Noch nicht verwendet';
      }
      
      console.log('✅ Einstellungen geladen:', preferredLang);
    } catch (error) {
      console.error('❌ Fehler beim Laden:', error);
      currentLangDisplay.textContent = 'Fehler';
    }
  }

  // Sprache speichern bei Änderung
  languageSelect.addEventListener('change', async (event) => {
    const newLang = event.target.value;
    
    try {
      await chrome.storage.local.set({ preferredLanguage: newLang });
      currentLangDisplay.textContent = getLanguageEmoji(newLang) + ' ' + newLang;
      
      // Cache leeren bei Sprachwechsel
      await chrome.runtime.sendMessage({ action: 'clearCache' });
      
      // Visuelles Feedback
      languageSelect.classList.add('changed');
      setTimeout(() => languageSelect.classList.remove('changed'), 300);
      
      console.log('✅ Sprache geändert:', newLang);
      
      // Toast-Nachricht anzeigen
      showToast(`Sprache geändert zu ${getLanguageEmoji(newLang)} ${newLang}`);
      
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Einstellung');
    }
  });

  // Cache leeren Button
  clearCacheBtn.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearCache' });
      showToast('✅ Cache geleert');
      console.log('✅ Cache manuell geleert');
    } catch (error) {
      console.error('❌ Fehler beim Cache-Leeren:', error);
      showToast('❌ Fehler beim Cache-Leeren');
    }
  });

  // Seite neu laden Button
  reloadPageBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url.includes('crunchyroll.com')) {
        await chrome.tabs.reload(tab.id);
        window.close();
      } else {
        showToast('⚠️ Öffne erst crunchyroll.com');
      }
    } catch (error) {
      console.error('❌ Fehler beim Neuladen:', error);
      showToast('❌ Fehler beim Neuladen');
    }
  });

  // Hilfsfunktion: Emoji zur Sprache
  function getLanguageEmoji(lang) {
    const emojis = {
      'deutsch': '🇩🇪',
      'englisch': '🇬🇧',
      'français': '🇫🇷',
      'japanisch': '🇯🇵',
      'spanisch': '🇪🇸',
      'portugiesisch': '🇵🇹',
      'italienisch': '🇮🇹',
      'russisch': '🇷🇺',
      'arabisch': '🇸🇦',
      'koreanisch': '🇰🇷',
      'chinesisch': '🇨🇳'
    };
    return emojis[lang] || '🌐';
  }

  // Toast-Nachricht anzeigen
  function showToast(message) {
    // Existierenden Toast entfernen
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    // Neuen Toast erstellen
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animation starten
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Nach 3 Sekunden ausblenden
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initial laden
  loadSettings();
});
