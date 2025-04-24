console.log("✅ content.js gestartet");

const sprache = "deutsch";

waitForSeriesLinks()
  .then((links) => {
    console.log(`[CR Deutsch Filter] ${links.length} Serienkarten gefunden`);
    checkNextSeries(links, 0); 
  })
  .catch((err) => {
    console.error("🚨 Fehler beim Warten auf Serienkarten:", err);
  });

function checkNextSeries(links, index) {
  if (index >= links.length) {
    console.log("✅ Alle Serien geprüft");
    return;
  }

  const link = links[index];
  const href = link.getAttribute("href");
  if (!href || !href.startsWith("/de/series/")) {
    return checkNextSeries(links, index + 1);
  }

  const seriesId = href.split("/")[3];
  const url = "https://www.crunchyroll.com" + href;

  console.log(`📺 [${index + 1}/${links.length}] Prüfe Serie: ${seriesId} → ${url}`);

  
  const iframe = document.createElement("iframe");
  iframe.style.display = "none"; 
  iframe.src = url;
  document.body.appendChild(iframe);

  let attempts = 0;
  const maxTries = 15;

  const interval = setInterval(() => {
    if (!iframe.contentWindow) {
      console.warn("⚠️ Iframe wurde blockiert oder ist nicht verfügbar:", seriesId);
      clearInterval(interval);
      return checkNextSeries(links, index + 1);
    }

    if (attempts++ > maxTries) {
      console.warn("⏱️ Timeout bei Serie:", seriesId);
      iframe.remove(); 
      clearInterval(interval);
      return checkNextSeries(links, index + 1);
    }

    browser.runtime.sendMessage({ type: "get-language-status", seriesId }).then((res) => {
      if (res.hasLanguage === null) return; 

      clearInterval(interval);

      iframe.remove(); 

      const card = link.closest(".erc-show-card") || link.closest("li") || link.parentElement?.parentElement;
      if (!res.hasLanguage) {
        if (card) {
          card.style.filter = "grayscale(100%) brightness(0.4)";
          const overlay = document.createElement("div");
          overlay.textContent = `Kein ${sprache}`;
          overlay.style.position = "absolute";
          overlay.style.top = "10px";
          overlay.style.left = "10px";
          overlay.style.background = "rgba(0,0,0,0.7)";
          overlay.style.color = "white";
          overlay.style.padding = "4px 8px";
          overlay.style.fontSize = "12px";
          overlay.style.zIndex = "10";
          card.appendChild(overlay);
        }
      } else {
        console.log(`✅ ${sprache} erkannt für`, seriesId);
      }

      checkNextSeries(links, index + 1);
    });
  }, 1000);
}

function waitForSeriesLinks(maxWait = 15000, interval = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const links = document.querySelectorAll('a[href^="/de/series/"]');
      if (links.length > 0) resolve(links);
      else if (Date.now() - start > maxWait) reject();
      else setTimeout(check, interval);
    };
    check();
  });
}
