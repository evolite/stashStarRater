// fallow-ignore-file unused-file
"use strict";
(() => {
  // src/stashStarRater.ts
  var STAR_COUNT = 10;
  var COLOR_FILL = "#f0b429";
  var COLOR_EMPTY = "rgba(255,255,255,0.22)";
  var STAR_D = "M12,17.27 L18.18,21 L16.54,13.97 L22,9.24 L14.81,8.63 L12,2 L9.19,8.63 L2,9.24 L7.46,13.97 L5.82,21 Z";
  var replaced = /* @__PURE__ */ new WeakSet();
  function injectCSS() {
    if (document.getElementById("sr-styles")) return;
    const s = document.createElement("style");
    s.id = "sr-styles";
    s.textContent = [
      ".sr-stars{display:inline-flex;gap:2px;align-items:center;vertical-align:middle;}",
      ".sr-star{position:relative;width:24px;height:24px;flex-shrink:0;",
      "background:none;border:none;padding:0;cursor:pointer;",
      "transition:transform 80ms ease;}",
      ".sr-star:hover{transform:scale(1.12);}",
      ".sr-star svg{position:absolute;inset:0;pointer-events:none;}"
    ].join("");
    document.head.appendChild(s);
  }
  function makeSvg(color) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", STAR_D);
    path.setAttribute("fill", color);
    svg.appendChild(path);
    return svg;
  }
  function createStarButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sr-star";
    btn.appendChild(makeSvg(COLOR_EMPTY));
    const filled = makeSvg(COLOR_FILL);
    filled.style.clipPath = "inset(0 100% 0 0)";
    btn.appendChild(filled);
    btn._filled = filled;
    return btn;
  }
  function setFill(btn, fraction) {
    btn._filled.style.clipPath = `inset(0 ${Math.round((1 - fraction) * 100)}% 0 0)`;
  }
  function renderStars(buttons, value) {
    for (let i = 0; i < buttons.length; i++) {
      const n = i + 1;
      setFill(buttons[i], value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0);
    }
  }
  function hoverValue(container, clientX) {
    for (let i = 0; i < container.children.length; i++) {
      const r = container.children[i].getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right)
        return clientX - r.left < r.width / 2 ? i + 0.5 : i + 1;
    }
    return null;
  }
  function readStars(el) {
    const propsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
    if (propsKey) {
      const props = el[propsKey];
      for (const field of ["value", "defaultValue", "children"]) {
        const raw2 = parseFloat(String(props[field] ?? ""));
        if (!isNaN(raw2) && raw2 > 0) {
          return raw2 > STAR_COUNT ? raw2 / 100 * STAR_COUNT : raw2;
        }
      }
    }
    const domStr = el instanceof HTMLInputElement ? el.value : el.textContent ?? "";
    const raw = parseFloat(domStr);
    if (!isNaN(raw) && raw > 0) {
      return raw > STAR_COUNT ? raw / 100 * STAR_COUNT : raw;
    }
    return 0;
  }
  var ENTITY_MAP = {
    scenes: ["sceneUpdate", "SceneUpdateInput"],
    images: ["imageUpdate", "ImageUpdateInput"],
    performers: ["performerUpdate", "PerformerUpdateInput"],
    studios: ["studioUpdate", "StudioUpdateInput"],
    groups: ["groupUpdate", "GroupUpdateInput"],
    galleries: ["galleryUpdate", "GalleryUpdateInput"],
    movies: ["movieUpdate", "MovieUpdateInput"]
  };
  function parseEntity() {
    const m = window.location.pathname.match(
      /\/(scenes|images|performers|studios|groups|galleries|movies)\/(\d+)/
    );
    if (!m) return null;
    const cfg = ENTITY_MAP[m[1]];
    if (!cfg) return null;
    return { mutation: cfg[0], inputType: cfg[1], id: m[2] };
  }
  async function saveRating(starValue) {
    const entity = parseEntity();
    if (!entity) return;
    const rating100 = Math.round(starValue / STAR_COUNT * 100);
    const apiKey = window.PluginApi?.apiKey ?? window.stash?.apiKey ?? "";
    const res = await fetch("/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...apiKey ? { ApiKey: apiKey } : {}
      },
      body: JSON.stringify({
        query: `mutation($i:${entity.inputType}!){${entity.mutation}(input:$i){id rating100}}`,
        variables: { i: { id: entity.id, rating100 } }
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  }
  function inject(el) {
    if (replaced.has(el)) return;
    replaced.add(el);
    el.style.opacity = "0";
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.width = "1px";
    el.style.height = "1px";
    const container = document.createElement("div");
    container.className = "sr-stars";
    const buttons = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const btn = createStarButton();
      container.appendChild(btn);
      buttons.push(btn);
    }
    el.parentNode.insertBefore(container, el);
    let committed = readStars(el);
    renderStars(buttons, committed);
    container.addEventListener("mousemove", (e) => {
      const v = hoverValue(container, e.clientX);
      if (v !== null) renderStars(buttons, v);
    });
    container.addEventListener("mouseleave", () => {
      renderStars(buttons, committed);
    });
    container.addEventListener("click", (e) => {
      const v = hoverValue(container, e.clientX);
      if (v === null) return;
      const prev = committed;
      committed = v;
      renderStars(buttons, committed);
      saveRating(v).catch(() => {
        committed = prev;
        renderStars(buttons, committed);
      });
    });
    let frames = 0;
    (function poll() {
      const v = readStars(el);
      if (v !== committed) {
        committed = v;
        renderStars(buttons, committed);
      }
      if (committed === 0 && ++frames < 300) requestAnimationFrame(poll);
    })();
  }
  var SELECTORS = [
    "input.rating-number",
    'input[type="number"][class*="rating"]',
    '.HoverRating input[type="number"]',
    'input[aria-label*="ating"][type="number"]',
    'input[data-testid*="ating"][type="number"]',
    ".rating-number"
  ];
  function scan() {
    for (const sel of SELECTORS)
      document.querySelectorAll(sel).forEach(inject);
  }
  function init() {
    injectCSS();
    scan();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        scan();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
