console.log("📄 series-content.js aktiv");

setTimeout(() => {
  const audioBlocks = document.querySelectorAll('[data-t="detail-row-audio-language"]');
  let hasLanguage = false; 

  audioBlocks.forEach((audioBlock) => {
    const desc = audioBlock.querySelector('[data-t="details-item-description"]');
    const text = desc?.textContent.toLowerCase() || "";

    if (text.includes("deutsch")) {
      hasLanguage = true; 
    }
  });

  const seriesId = window.location.pathname.split("/")[3];
  console.log(`📨 Sprache ${hasLanguage ? "✅ erkannt" : "❌ nicht erkannt"} für ${seriesId}`);

  
  browser.runtime.sendMessage({
    type: "language-check-result",
    seriesId,
    hasLanguage
  });
}, 1500); 



