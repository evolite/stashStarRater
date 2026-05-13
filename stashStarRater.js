// fallow-ignore-file unused-file
"use strict";
(() => {
  // src/stashStarRater.ts
  var STAR_COUNT = 10;
  var GOLD_COLOR = "#ffc107";
  var style = document.createElement("style");
  style.id = "stash-star-rater-styles";
  style.textContent = `
  .rating-stars .unfilled-star, 
  .rating-stars .unfilled-star svg {
    color: var(--gold, ${GOLD_COLOR}) !important;
    fill: transparent !important;
  }
  .rating-stars .filled-star, 
  .rating-stars .filled-star svg {
    color: var(--gold, ${GOLD_COLOR}) !important;
    fill: var(--gold, ${GOLD_COLOR}) !important;
  }
  .rating-stars button.btn-secondary.minimal {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 1px !important;
  }
`;
  if (!document.getElementById(style.id)) document.head.appendChild(style);
  var STAR_FILLED_PATH = "M309.5-18.9c-4.1-8-12.4-13.1-21.4-13.1s-17.3 5.1-21.4 13.1L193.1 125.3 33.2 150.7c-8.9 1.4-16.3 7.7-19.1 16.3s-.5 18 5.8 24.4l114.4 114.5-25.2 159.9c-1.4 8.9 2.3 17.9 9.6 23.2s16.9 6.1 25 2L288.1 417.6 432.4 491c8 4.1 17.7 3.3 25-2s11-14.2 9.6-23.2L441.7 305.9 556.1 191.4c6.4-6.4 8.6-15.8 5.8-24.4s-10.1-14.9-19.1-16.3L383 125.3 309.5-18.9z";
  var STAR_EMPTY_PATH = "M288.1-32c9 0 17.3 5.1 21.4 13.1L383 125.3 542.9 150.7c8.9 1.4 16.3 7.7 19.1 16.3s.5 18-5.8 24.4L441.7 305.9 467 465.8c1.4 8.9-2.3 17.9-9.6 23.2s-17 6.1-25 2L288.1 417.6 143.8 491c-8 4.1-17.7 3.3-25-2s-11-14.2-9.6-23.2L134.4 305.9 20 191.4c-6.4-6.4-8.6-15.8-5.8-24.4s10.1-14.9 19.1-16.3l159.9-25.4 73.6-144.2c4.1-8 12.4-13.1 21.4-13.1zm0 76.8L230.3 158c-3.5 6.8-10 11.6-17.6 12.8l-125.5 20 89.8 89.9c5.4 5.4 7.9 13.1 6.7 20.7l-19.8 125.5 113.3-57.6c6.8-3.5 14.9-3.5 21.8 0l113.3 57.6-19.8-125.5c-1.2-7.6 1.3-15.3 6.7-20.7l89.8-89.9-125.5-20c-7.6-1.2-14.1-6-17.6-12.8L288.1 44.8z";
  var replaced = /* @__PURE__ */ new WeakSet();
  function makeFallbackDiv(className) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 576 512");
    svg.setAttribute("class", "svg-inline--fa " + (className === "filled-star" ? "set" : "unset"));
    const path = document.createElementNS(ns, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", className === "filled-star" ? STAR_FILLED_PATH : STAR_EMPTY_PATH);
    svg.appendChild(path);
    const div = document.createElement("div");
    div.className = className;
    div.appendChild(svg);
    return div;
  }
  function createStarButton(filledTmpl, emptyTmpl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "minimal star-fill-0 btn btn-secondary";
    btn.dataset.srBtn = "1";
    btn.appendChild(filledTmpl ? filledTmpl.cloneNode(true) : makeFallbackDiv("filled-star"));
    let emptyDiv;
    if (emptyTmpl) {
      emptyDiv = emptyTmpl.cloneNode(true);
    } else if (filledTmpl) {
      emptyDiv = filledTmpl.cloneNode(true);
      emptyDiv.className = "unfilled-star";
      const svg = emptyDiv.querySelector("svg");
      if (svg) {
        svg.classList.remove("set");
        svg.classList.add("unset");
      }
    } else {
      emptyDiv = makeFallbackDiv("unfilled-star");
    }
    btn.appendChild(emptyDiv);
    return btn;
  }
  function setStarClass(btn, fraction) {
    const pct = fraction >= 1 ? 100 : fraction >= 0.5 ? 50 : 0;
    btn.classList.remove("star-fill-0", "star-fill-50", "star-fill-100");
    btn.classList.add(`star-fill-${pct}`);
  }
  function renderStars(buttons, value) {
    for (let i = 0; i < buttons.length; i++) {
      const n = i + 1;
      setStarClass(buttons[i], value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0);
    }
  }
  function hoverValue(buttons, clientX) {
    for (let i = 0; i < buttons.length; i++) {
      const r = buttons[i].getBoundingClientRect();
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
        if (!isNaN(raw2) && raw2 > 0) return raw2 > STAR_COUNT ? raw2 / 100 * STAR_COUNT : raw2;
      }
    }
    const domStr = el instanceof HTMLInputElement ? el.value : el.textContent ?? "";
    const raw = parseFloat(domStr);
    return !isNaN(raw) && raw > 0 ? raw > STAR_COUNT ? raw / 100 * STAR_COUNT : raw : 0;
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
  async function saveRating(starValue) {
    const m = window.location.pathname.match(/\/(scenes|images|performers|studios|groups|galleries|movies)\/(\d+)/);
    if (!m) return;
    const cfg = ENTITY_MAP[m[1]];
    if (!cfg) return;
    const rating100 = Math.round(starValue / STAR_COUNT * 100);
    const apiKey = window.PluginApi?.apiKey ?? window.stash?.apiKey ?? "";
    await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...apiKey ? { ApiKey: apiKey } : {} },
      body: JSON.stringify({
        query: `mutation($i:${cfg[1]}!){${cfg[0]}(input:$i){id rating100}}`,
        variables: { i: { id: m[2], rating100 } }
      })
    });
  }
  function inject(el) {
    const starsParent = el.closest(".rating-stars");
    const isDecimal = !starsParent && el.classList.contains("rating-number");
    const container = starsParent ?? (isDecimal ? el : null);
    if (!container || replaced.has(container)) return;
    replaced.add(container);
    if (isDecimal) container.style.pointerEvents = "auto";
    const valueEl = isDecimal ? el.querySelector("span") ?? el : el;
    const filledTmpl = container.querySelector(".filled-star");
    const emptyTmpl = container.querySelector(".unfilled-star");
    if (isDecimal) {
      Array.from(container.children).forEach((c) => {
        c.style.display = "none";
      });
    } else {
      container.querySelectorAll(":scope > button").forEach((b) => {
        b.style.display = "none";
      });
    }
    const buttonParent = isDecimal ? (() => {
      const w = document.createElement("div");
      w.className = "rating-stars";
      container.appendChild(w);
      return w;
    })() : container;
    const buttons = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const btn = createStarButton(filledTmpl, emptyTmpl);
      isDecimal ? buttonParent.appendChild(btn) : buttonParent.insertBefore(btn, valueEl);
      buttons.push(btn);
    }
    const ratingNumSpan = isDecimal ? (() => {
      const s = document.createElement("span");
      s.className = "star-rating-number";
      buttonParent.appendChild(s);
      return s;
    })() : null;
    const show = (v) => {
      renderStars(buttons, v);
      const txt = v > 0 ? String(v) : "";
      valueEl.textContent = txt;
      if (ratingNumSpan) ratingNumSpan.textContent = txt;
    };
    let committed = readStars(valueEl);
    let hovering = false;
    show(committed);
    const eventTarget = isDecimal ? buttonParent : container;
    eventTarget.addEventListener("mousemove", (e) => {
      hovering = true;
      show(hoverValue(buttons, e.clientX) ?? committed);
    });
    eventTarget.addEventListener("mouseleave", () => {
      hovering = false;
      show(committed);
    });
    eventTarget.addEventListener("click", (e) => {
      const v = hoverValue(buttons, e.clientX);
      if (v === null) return;
      const prev = committed;
      committed = v;
      show(committed);
      saveRating(v).catch(() => {
        committed = prev;
        show(committed);
      });
    });
    const syncInterval = setInterval(() => {
      if (!document.contains(container)) {
        clearInterval(syncInterval);
        return;
      }
      const v = readStars(valueEl);
      if (v !== committed && !hovering) {
        committed = v;
        show(committed);
      }
    }, 1e3);
  }
  var SELECTORS = [".star-rating-number", ".rating-number"];
  function scan() {
    for (const sel of SELECTORS)
      document.querySelectorAll(sel).forEach(inject);
  }
  function init() {
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
