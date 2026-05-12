const STAR_COUNT = 10;
const COLOR_FILL  = '#f0b429';
const COLOR_EMPTY = 'rgba(255,255,255,0.22)';
const STAR_D = 'M12,17.27 L18.18,21 L16.54,13.97 L22,9.24 L14.81,8.63 L12,2 L9.19,8.63 L2,9.24 L7.46,13.97 L5.82,21 Z';

interface StarButton extends HTMLButtonElement {
  _filled: SVGElement;
}

// Works for both HTMLInputElement and HTMLElement (span) targets
const replaced = new WeakSet<HTMLElement>();

function injectCSS(): void {
  if (document.getElementById('sr-styles')) return;
  const s = document.createElement('style');
  s.id = 'sr-styles';
  s.textContent = [
    '.sr-stars{display:inline-flex;gap:2px;align-items:center;vertical-align:middle;}',
    '.sr-star{position:relative;width:24px;height:24px;flex-shrink:0;',
             'background:none;border:none;padding:0;cursor:pointer;',
             'transition:transform 80ms ease;}',
    '.sr-star:hover{transform:scale(1.12);}',
    '.sr-star svg{position:absolute;inset:0;pointer-events:none;}',
  ].join('');
  document.head.appendChild(s);
}

function makeSvg(color: string): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', STAR_D);
  path.setAttribute('fill', color);
  svg.appendChild(path);
  return svg;
}

function createStarButton(): StarButton {
  const btn = document.createElement('button') as StarButton;
  btn.type = 'button';
  btn.className = 'sr-star';
  btn.appendChild(makeSvg(COLOR_EMPTY));
  const filled = makeSvg(COLOR_FILL);
  filled.style.clipPath = 'inset(0 100% 0 0)';
  btn.appendChild(filled);
  btn._filled = filled;
  return btn;
}

function setFill(btn: StarButton, fraction: number): void {
  btn._filled.style.clipPath = `inset(0 ${Math.round((1 - fraction) * 100)}% 0 0)`;
}

function renderStars(buttons: StarButton[], value: number): void {
  for (let i = 0; i < buttons.length; i++) {
    const n = i + 1;
    setFill(buttons[i], value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0);
  }
}

function hoverValue(container: HTMLElement, clientX: number): number | null {
  for (let i = 0; i < container.children.length; i++) {
    const r = container.children[i].getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right)
      return clientX - r.left < r.width / 2 ? i + 0.5 : i + 1;
  }
  return null;
}

/**
 * Read the current star value (0–10) from any element.
 *
 * Checks in order:
 *  1. React fiber props (available before DOM flush, handles both inputs and spans):
 *     - props.value / props.defaultValue  → input-style controlled value
 *     - props.children                    → span text like "8.5"
 *  2. DOM value (input.value) or textContent (span)
 *
 * Scale auto-detection: raw > STAR_COUNT means it's a 0–100 rating100 value;
 * otherwise it's already a 0–10 display value.
 */
function readStars(el: HTMLElement): number {
  const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
  if (propsKey) {
    const props = (el as any)[propsKey] as Record<string, unknown>;
    for (const field of ['value', 'defaultValue', 'children']) {
      const raw = parseFloat(String(props[field] ?? ''));
      if (!isNaN(raw) && raw > 0) {
        return raw > STAR_COUNT ? (raw / 100) * STAR_COUNT : raw;
      }
    }
  }
  // DOM fallback
  const domStr = el instanceof HTMLInputElement
    ? el.value
    : (el.textContent ?? '');
  const raw = parseFloat(domStr);
  if (!isNaN(raw) && raw > 0) {
    return raw > STAR_COUNT ? (raw / 100) * STAR_COUNT : raw;
  }
  return 0;
}

// --- GraphQL save ---

const ENTITY_MAP: Record<string, [string, string]> = {
  scenes:     ['sceneUpdate',     'SceneUpdateInput'],
  images:     ['imageUpdate',     'ImageUpdateInput'],
  performers: ['performerUpdate', 'PerformerUpdateInput'],
  studios:    ['studioUpdate',    'StudioUpdateInput'],
  groups:     ['groupUpdate',     'GroupUpdateInput'],
  galleries:  ['galleryUpdate',   'GalleryUpdateInput'],
  movies:     ['movieUpdate',     'MovieUpdateInput'],
};

function parseEntity(): { mutation: string; inputType: string; id: string } | null {
  const m = window.location.pathname.match(
    /\/(scenes|images|performers|studios|groups|galleries|movies)\/(\d+)/
  );
  if (!m) return null;
  const cfg = ENTITY_MAP[m[1]];
  if (!cfg) return null;
  return { mutation: cfg[0], inputType: cfg[1], id: m[2] };
}

async function saveRating(starValue: number): Promise<void> {
  const entity = parseEntity();
  if (!entity) return;
  const rating100 = Math.round((starValue / STAR_COUNT) * 100);
  const apiKey: string = (window as any).PluginApi?.apiKey ?? (window as any).stash?.apiKey ?? '';
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { ApiKey: apiKey } : {}),
    },
    body: JSON.stringify({
      query: `mutation($i:${entity.inputType}!){${entity.mutation}(input:$i){id rating100}}`,
      variables: { i: { id: entity.id, rating100 } },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { errors?: unknown[] };
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
}

function inject(el: HTMLElement): void {
  if (replaced.has(el)) return;
  replaced.add(el);

  el.style.opacity = '0';
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.width = '1px';
  el.style.height = '1px';

  const container = document.createElement('div');
  container.className = 'sr-stars';

  const buttons: StarButton[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const btn = createStarButton();
    container.appendChild(btn);
    buttons.push(btn);
  }

  el.parentNode!.insertBefore(container, el);

  let committed = readStars(el);
  renderStars(buttons, committed);

  container.addEventListener('mousemove', (e: MouseEvent) => {
    const v = hoverValue(container, e.clientX);
    if (v !== null) renderStars(buttons, v);
  });

  container.addEventListener('mouseleave', () => {
    renderStars(buttons, committed);
  });

  container.addEventListener('click', (e: MouseEvent) => {
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

  // Poll until a non-zero rating appears (GraphQL may not have resolved yet).
  // Stops as soon as a value is found; hard-caps at ~5 s.
  let frames = 0;
  (function poll() {
    const v = readStars(el);
    if (v !== committed) { committed = v; renderStars(buttons, committed); }
    if (committed === 0 && ++frames < 300) requestAnimationFrame(poll);
  })();
}

const SELECTORS = [
  'input.rating-number',
  'input[type="number"][class*="rating"]',
  '.HoverRating input[type="number"]',
  'input[aria-label*="ating"][type="number"]',
  'input[data-testid*="ating"][type="number"]',
  '.rating-number',
];

function scan(): void {
  for (const sel of SELECTORS)
    document.querySelectorAll<HTMLElement>(sel).forEach(inject);
}

function init(): void {
  injectCSS();
  scan();
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  }).observe(document.body, { childList: true, subtree: true });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
