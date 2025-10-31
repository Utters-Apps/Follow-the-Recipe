<script>
(function () {
  // evita múltiplas injeções
  if (window.__injectedProtectionActive) {
    console.log('Proteção já ativa.');
    return;
  }
  window.__injectedProtectionActive = true;

  // ---- SELECTORS ----
  // variações do iframe do Google Translate (usadas em vários pontos)
  const iframeSelectors = [
    'iframe#gt-nvframe',
    'iframe[title="Google Translate navigation"]',
    'iframe[src*="websitetranslationui"]',
    'iframe[src*="translate.google.com/websitetranslationui"]'
  ];

  // Seletores já conhecidos a serem REMOVIDOS (concatena iframes também)
  const removeSelectors = [
    'body#neterror-body.neterror[data-error-code="ERR_BLOCKED_BY_RESPONSE"]',
    'svg#corner-topright',
    'svg#corner-btmleft',
    '.marquee-wrap',
    '#content-container',
    'md-dialog[type="alert"][open]',
    'md-dialog[open]'
  ].concat(iframeSelectors);

  // Seletores a ESCONDER
  const hideSelectors = [
    'div[jsname="ctOWCc"].b7B4sd',
    'div[jsname="ctOWCc"]'
  ];

  // ---- UTIL ----
  function safeQuerySelectorAll(selector) {
    try {
      return document.querySelectorAll(selector);
    } catch (e) { return []; }
  }

  function removeElement(el) {
    try {
      if (!el) return;
      if (el instanceof HTMLElement) {
        el.style.pointerEvents = 'none';
      }
      el.remove();
    } catch (e) {
      console.error('Erro ao remover elemento:', e);
    }
  }

  // Remove e retorna altura (px) aproximada antes de remover
  function removeAndGetHeight(el) {
    try {
      if (!el) return 0;
      const rect = (typeof el.getBoundingClientRect === 'function') ? el.getBoundingClientRect() : null;
      const h = rect && rect.height ? Math.round(rect.height) : 0;
      if (el instanceof HTMLElement) {
        el.style.pointerEvents = 'none';
      }
      el.remove();
      return h || 0;
    } catch (e) {
      console.error('Erro ao remover elemento (removeAndGetHeight):', e);
      return 0;
    }
  }

  function hideElement(el) {
    try {
      if (!el || el._hiddenByScript) return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el._hiddenByScript = true;
    } catch (e) {
      console.error('Erro ao esconder elemento:', e);
    }
  }

  // Ajusta layout subtraindo offsetPx de top/marginTop/paddingTop/translateY onde fizer sentido
  function fixLayout(offsetPx) {
    try {
      if (!offsetPx || offsetPx <= 0) return;

      // 1) Ajustar root/body/html se necessário
      [document.documentElement, document.body].forEach(root => {
        try {
          if (!root || !(root instanceof Element)) return;
          const cs = getComputedStyle(root);
          const mt = parseFloat(cs.marginTop) || 0;
          const pt = parseFloat(cs.paddingTop) || 0;
          if (mt >= offsetPx - 0.5) root.style.marginTop = (mt - offsetPx) + 'px';
          if (pt >= offsetPx - 0.5) root.style.paddingTop = (pt - offsetPx) + 'px';
        } catch(e){}
      });

      // 2) Varre elementos visíveis e ajusta top / margin-top / padding-top / transform
      const all = document.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        try {
          const cs = getComputedStyle(el);

          // ajustar 'top' para elementos posicionados
          if (['fixed','absolute','sticky','relative'].includes(cs.position)) {
            const topVal = parseFloat(cs.top);
            if (!isNaN(topVal) && topVal >= offsetPx - 0.5) {
              el.style.top = (topVal - offsetPx) + 'px';
            }
          }

          // ajustar marginTop se for igual/maior que offset
          const mTop = parseFloat(cs.marginTop);
          if (!isNaN(mTop) && mTop >= offsetPx - 0.5) {
            el.style.marginTop = (mTop - offsetPx) + 'px';
          }

          // ajustar paddingTop se for igual/maior que offset
          const pTop = parseFloat(cs.paddingTop);
          if (!isNaN(pTop) && pTop >= offsetPx - 0.5) {
            el.style.paddingTop = (pTop - offsetPx) + 'px';
          }

          // ajustar transform: translateY / translate(...) se possível
          const tr = cs.transform || cs.webkitTransform;
          if (tr && tr !== 'none') {
            // tentativa simples: pegar translateY(...) isolado
            const m2 = tr.match(/translateY\(\s*([-+]?\d+(\.\d+)?)px\s*\)/);
            if (m2) {
              const yVal = parseFloat(m2[1]) || 0;
              if (Math.abs(yVal) >= offsetPx - 0.5) {
                const newY = (yVal >= 0 ? (yVal - offsetPx) : (yVal + offsetPx));
                el.style.transform = tr.replace(/translateY\([^)]*\)/, `translateY(${newY}px)`);
              }
            } else {
              // pegar translate(...) ou translate3d(...) simples e ajustar segundo valor se houver
              const parts = tr.match(/translate(?:3d)?\(([^)]+)\)/);
              if (parts && parts[1]) {
                const coords = parts[1].split(',').map(s => s.trim());
                const yStr = coords.length === 1 ? coords[0] : (coords[1] || coords[0]);
                const yVal = parseFloat(yStr) || 0;
                if (Math.abs(yVal) >= offsetPx - 0.5) {
                  const newY = (yVal >= 0 ? (yVal - offsetPx) : (yVal + offsetPx));
                  el.style.transform = `translateY(${newY}px)`;
                }
              }
            }
          }
        } catch (e) {
          // ignora erros em shadow DOM ou elementos especiais
        }
      }

      // 3) Injetar fallback CSS para garantir que não haja espaço reservado no topo
      const id = 'fix-top-offset-fallback-style';
      if (!document.getElementById(id)) {
        const s = document.createElement('style');
        s.id = id;
        s.textContent = `
          html, body, #content, #content-container, main {
            margin-top: 0 !important;
            padding-top: 0 !important;
            transform: none !important;
          }
        `;
        (document.head || document.documentElement).appendChild(s);
      }
    } catch (err) {
      console.error('Erro em fixLayout:', err);
    }
  }

  // ---- processNode unificado ----
  // retorna altura removida (px) se remover um iframe; 0 caso contrário
  function processNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return 0;
    const el = node;

    // 1) se o próprio nodo for um iframe de interesse, remove e retorna sua altura
    try {
      for (const sel of iframeSelectors) {
        if (!sel) continue;
        try {
          if (el.matches && el.matches(sel)) {
            return removeAndGetHeight(el);
          }
        } catch(e){}
      }
    } catch(e){}

    // 2) se o nodo contém um iframe de interesse (wrapper), remove e retorna altura
    try {
      for (const sel of iframeSelectors) {
        try {
          const found = el.querySelector && el.querySelector(sel);
          if (found) {
            const h = removeAndGetHeight(found);
            return h;
          }
        } catch(e){}
      }
    } catch(e){}

    // 3) remover outros seletores conhecidos dentro do nodo
    try {
      if (removeSelectors.length) {
        const foundRemove = el.querySelectorAll(removeSelectors.join(','));
        foundRemove.forEach(n => {
          try { n.remove(); } catch(e){}
        });
      }
    } catch(e){}

    // 4) esconder seletores conhecidos dentro do nodo
    try {
      if (hideSelectors.length) {
        const foundHide = el.querySelectorAll(hideSelectors.join(','));
        foundHide.forEach(n => hideElement(n));
      }
    } catch(e){}

    // 5) se o próprio nodo casar com removeSelectors (não iframe), remove
    try {
      for (const sel of removeSelectors) {
        if (!sel) continue;
        try {
          if (el.matches && el.matches(sel)) {
            removeElement(el);
            return 0;
          }
        } catch(e){}
      }
    } catch(e){}

    // 6) se o próprio nodo casar com hideSelectors, esconder
    try {
      for (const sel of hideSelectors) {
        if (!sel) continue;
        try {
          if (el.matches && el.matches(sel)) {
            hideElement(el);
          }
        } catch(e){}
      }
    } catch(e){}

    return 0;
  }

  // ---- 1) Passada inicial: remover/esconder já existentes e aplicar fix se necessário ----
  (function initialPass() {
    try {
      let totalOffset = 0;

      // tenta remover iframes diretamente e computar offset máximo encontrado
      for (const sel of iframeSelectors) {
        try {
          const f = document.querySelector(sel);
          if (f) {
            const h = removeAndGetHeight(f);
            if (h > totalOffset) totalOffset = h;
          }
        } catch(e){}
      }

      // remover outros seletores conhecidos
      try { safeQuerySelectorAll(removeSelectors.join(',')).forEach(el => removeElement(el)); } catch(e){}
      // esconder hideSelectors
      try { safeQuerySelectorAll(hideSelectors.join(',')).forEach(el => hideElement(el)); } catch(e){}

      if (totalOffset > 0) {
        // aplica fix com pequeno delay para dar tempo a layout recalcular
        setTimeout(()=>fixLayout(totalOffset), 30);
        setTimeout(()=>fixLayout(totalOffset), 500);
      }
    } catch(e){
      console.error('Erro na initialPass:', e);
    }
  })();

  // ---- 2) MutationObserver para mudanças futuras ----
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          try {
            const offset = processNode(node);
            if (offset && offset > 0) {
              // aplicar correção com pequenos delays (scripts podem reajustar logo após inserir)
              setTimeout(()=>fixLayout(offset), 30);
              setTimeout(()=>fixLayout(offset), 500);
            }
          } catch(e){}
        });
      }
      if (m.type === 'attributes' && m.target) {
        try {
          const offset = processNode(m.target);
          if (offset && offset > 0) setTimeout(()=>fixLayout(offset), 30);
        } catch(e){}
      }
    }
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['id','class','src','title','open','data-error-code','jsname','style']
  });

  // ---- 3) CSS fallback (esconder hideSelectors e md-dialog) ----
  const STYLE_ID = 'injected-protection-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${hideSelectors.join(',')} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      md-dialog[open] { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // ---- 4) Intervalos de segurança ----
  // a) intervalo para remoção/hide repetida (protege contra recriação)
  const intervalId = setInterval(() => {
    try {
      const toRemove = safeQuerySelectorAll(removeSelectors.join(','));
      if (toRemove.length) toRemove.forEach(el => removeElement(el));
      const toHide = safeQuerySelectorAll(hideSelectors.join(','));
      if (toHide.length) toHide.forEach(el => hideElement(el));
    } catch (e) { /* ignore */ }
  }, 700);

  // b) intervalo específico que tenta capturar iframes e aplicar fixLayout
  const safetyInterval = setInterval(() => {
    try {
      let offsetFound = 0;
      for (const sel of iframeSelectors) {
        try {
          const f = document.querySelector(sel);
          if (f) {
            const h = removeAndGetHeight(f);
            if (h > offsetFound) offsetFound = h;
          }
        } catch(e){}
      }
      if (offsetFound > 0) {
        setTimeout(()=>fixLayout(offsetFound), 30);
        setTimeout(()=>fixLayout(offsetFound), 500);
      }
    } catch(e){}
  }, 1000);

  // c) watcher para desativar varreduras pesadas se estabilizar
  let stable = 0;
  const watcher = setInterval(() => {
    try {
      const anyLeft = (safeQuerySelectorAll(removeSelectors.join(',')).length +
                       safeQuerySelectorAll(hideSelectors.join(',')).length);
      if (anyLeft === 0) stable++; else stable = 0;
      if (stable >= 20) { // ~20s de estabilidade
        clearInterval(intervalId);
        clearInterval(watcher);
      }
    } catch(e){}
  }, 1000);

  // d) stopper para safetyInterval se não encontrar iframe por ~30s
  let quiet = 0;
  const stopper = setInterval(() => {
    try {
      const anyIframe = iframeSelectors.some(sel => !!document.querySelector(sel));
      if (!anyIframe) quiet++; else quiet = 0;
      if (quiet >= 30) { // ~30s sem iframe
        clearInterval(safetyInterval);
        clearInterval(stopper);
      }
    } catch(e){}
  }, 1000);

  // desconecta observer e limpa intervalos ao descarregar a página (boa prática)
  window.addEventListener('beforeunload', () => {
    try { observer.disconnect(); } catch (e) {}
    try { clearInterval(intervalId); clearInterval(watcher); clearInterval(safetyInterval); clearInterval(stopper); } catch (e) {}
  });

  console.log('Proteção ativada — removendo iframes e elementos indesejados e corrigindo layout quando necessário.');
})();
</script>
