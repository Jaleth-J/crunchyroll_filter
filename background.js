const seriesStatus = {};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "language-check-result") {
    console.log("📬 Sprache erkannt empfangen:", message.seriesId, message.hasLanguage);
    seriesStatus[message.seriesId] = message.hasLanguage; // Speichern der Sprache für jede Serie
  }

  if (message.type === "get-language-status") {
    const status = seriesStatus[message.seriesId] ?? null;
    console.log("📤 Anfrage nach Sprachstatus:", message.seriesId, "→", status);
    sendResponse({ hasLanguage: status });
  }
});


