const STAR_COUNT = 10;

const style = document.createElement('style');
style.id = 'stash-star-rater-styles';
style.textContent = `
  .rating-stars button.btn-secondary.minimal { background: transparent !important; border: none !important; box-shadow: none !important; padding: 1px !important; }
  .rating-stars button[data-sr-btn] svg { width: 1.25rem; height: 1.25rem; display: block; }
  div.rating-number { width: auto !important; min-width: unset !important; }
  .rating-stars button[data-sr-btn] .filled-star svg { fill: gold !important; }
  .rating-stars button[data-sr-btn].star-fill-0 .unfilled-star svg { fill: white !important; }
  .rating-stars button[data-sr-btn].star-fill-50 .unfilled-star svg { fill: white !important; }
  .rating-stars button[data-sr-btn].star-fill-outline .filled-star { display: none; }
  .rating-stars button[data-sr-btn].star-fill-outline .unfilled-star { display: block; }
  .rating-stars button[data-sr-btn].star-fill-outline .unfilled-star svg { fill: gold !important; }
  .rating-stars button[data-sr-btn].star-fill-50.star-downrate .unfilled-star svg { fill: gold !important; }
  .rating-stars button[data-sr-btn].star-half-outline .filled-star { display: none; }
  .rating-stars button[data-sr-btn].star-half-outline .unfilled-star { display: block; }
  .rating-stars button[data-sr-btn].star-half-outline .unfilled-star svg path { fill: url(#sr-grad) !important; }
  @keyframes sr-pop { 0% { transform: scale(1); } 40% { transform: scale(1.5); } 100% { transform: scale(1); } }
  .rating-stars button[data-sr-btn].sr-pop { animation: sr-pop 0.2s ease-out; }
`;
if (!document.getElementById(style.id)) document.head.appendChild(style);

if (!document.getElementById('sr-grad')) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  svg.innerHTML = '<defs><linearGradient id="sr-grad" x1="0" x2="1" y1="0" y2="0"><stop offset="50%" stop-color="gold"/><stop offset="50%" stop-color="white"/></linearGradient></defs>';
  document.body.appendChild(svg);
}

const STAR_FILLED_PATH = 'M309.5-18.9c-4.1-8-12.4-13.1-21.4-13.1s-17.3 5.1-21.4 13.1L193.1 125.3 33.2 150.7c-8.9 1.4-16.3 7.7-19.1 16.3s-.5 18 5.8 24.4l114.4 114.5-25.2 159.9c-1.4 8.9 2.3 17.9 9.6 23.2s16.9 6.1 25 2L288.1 417.6 432.4 491c8 4.1 17.7 3.3 25-2s11-14.2 9.6-23.2L441.7 305.9 556.1 191.4c6.4-6.4 8.6-15.8 5.8-24.4s-10.1-14.9-19.1-16.3L383 125.3 309.5-18.9z';
const STAR_EMPTY_PATH  = 'M288.1-32c9 0 17.3 5.1 21.4 13.1L383 125.3 542.9 150.7c8.9 1.4 16.3 7.7 19.1 16.3s.5 18-5.8 24.4L441.7 305.9 467 465.8c1.4 8.9-2.3 17.9-9.6 23.2s-17 6.1-25 2L288.1 417.6 143.8 491c-8 4.1-17.7 3.3-25-2s-11-14.2-9.6-23.2L134.4 305.9 20 191.4c-6.4-6.4-8.6-15.8-5.8-24.4s10.1-14.9 19.1-16.3l159.9-25.4 73.6-144.2c4.1-8 12.4-13.1 21.4-13.1zm0 76.8L230.3 158c-3.5 6.8-10 11.6-17.6 12.8l-125.5 20 89.8 89.9c5.4 5.4 7.9 13.1 6.7 20.7l-19.8 125.5 113.3-57.6c6.8-3.5 14.9-3.5 21.8 0l113.3 57.6-19.8-125.5c-1.2-7.6 1.3-15.3 6.7-20.7l89.8-89.9-125.5-20c-7.6-1.2-14.1-6-17.6-12.8L288.1 44.8z';

const ENTITY_MAP: Record<string, { update: string; input: string }> = {
  scenes:     { update: 'sceneUpdate',     input: 'SceneUpdateInput'     },
  images:     { update: 'imageUpdate',     input: 'ImageUpdateInput'     },
  performers: { update: 'performerUpdate', input: 'PerformerUpdateInput' },
  studios:    { update: 'studioUpdate',    input: 'StudioUpdateInput'    },
  groups:     { update: 'groupUpdate',     input: 'GroupUpdateInput'     },
  galleries:  { update: 'galleryUpdate',   input: 'GalleryUpdateInput'   },
  movies:     { update: 'movieUpdate',     input: 'MovieUpdateInput'     },
};

const replaced = new WeakSet<HTMLElement>();
let reactPropsKey: string | undefined;

function getInfo() {
  const m = window.location.pathname.match(/\/(scenes|images|performers|studios|groups|galleries|movies)\/(\d+)/);
  return m ? { id: m[2], cfg: ENTITY_MAP[m[1]] } : null;
}

async function gql(query: string, variables: any) {
  const apiKey = (window as any).PluginApi?.apiKey ?? (window as any).stash?.apiKey ?? '';
  const r = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { ApiKey: apiKey } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const res = await r.json();
  if (res.errors?.length) throw new Error(JSON.stringify(res.errors));
  return res.data;
}

function inject(el: HTMLElement) {
  const container = el.closest<HTMLElement>('.rating-stars') ?? (el.classList.contains('rating-number') ? el : null);
  if (!container || replaced.has(container)) return;
  replaced.add(container);

  const isDecimal = container.classList.contains('rating-number');
  const valueEl = isDecimal ? (container.querySelector('span') ?? container) : el;

  if (isDecimal) {
    container.style.pointerEvents = 'auto';
    Array.from(container.children).forEach(c => (c as HTMLElement).style.display = 'none');
  } else {
    container.querySelectorAll<HTMLButtonElement>(':scope > button').forEach(b => b.style.display = 'none');
    (valueEl as HTMLElement).style.display = 'none';
  }

  const btnParent = isDecimal ? (() => {
    const div = document.createElement('div'); div.className = 'rating-stars'; container.appendChild(div); return div;
  })() : container;

  const buttons = Array.from({ length: STAR_COUNT }, () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'minimal star-fill-0 btn btn-secondary';
    btn.dataset.srBtn = '1';
    btn.innerHTML = `<div class="filled-star"><svg viewBox="0 0 576 512"><path d="${STAR_FILLED_PATH}"></path></svg></div>
                     <div class="unfilled-star"><svg viewBox="0 0 576 512"><path d="${STAR_EMPTY_PATH}"></path></svg></div>`;
    isDecimal ? btnParent.appendChild(btn) : btnParent.insertBefore(btn, valueEl);
    return btn;
  });

  const numSpan = (() => {
    const s = document.createElement('span'); s.className = 'sr-rating-number'; btnParent.appendChild(s); return s;
  })();

  let committed = 0;
  let hovering = false;
  let mutating = false;
  let pendingRating = NaN;
  let pendingAttempts = 0;
  let entityId = getInfo()?.id ?? null;

  const show = (v: number, base = v) => {
    const halfCommit = base % 1 !== 0 && v < base ? Math.ceil(base) : -1;
    buttons.forEach((btn, i) => {
      const starPos = i + 1;
      const f = v >= starPos ? 1 : v >= i + 0.5 ? 0.5 : 0;
      const isDownrate = f === 0 && starPos <= base;
      btn.classList.remove('star-fill-0', 'star-fill-50', 'star-fill-100', 'star-fill-outline', 'star-half-outline', 'star-downrate');
      if (starPos === halfCommit) {
        btn.classList.add('star-half-outline');   // half gold outline + half white outline at committed position
      } else if (isDownrate) {
        btn.classList.add('star-fill-outline');
      } else {
        btn.classList.add(`star-fill-${f * 100}`);
        if (f === 0.5 && starPos <= base) btn.classList.add('star-downrate');
      }
    });
    if (numSpan) numSpan.textContent = v > 0 ? String(v) : '';
  };

  let pollId: ReturnType<typeof setInterval>;
  const sync = () => {
    if (!document.contains(container)) { clearInterval(pollId); return; }
    const currentId = getInfo()?.id ?? null;
    if (currentId !== entityId) { entityId = currentId; committed = 0; hovering = false; pendingRating = NaN; pendingAttempts = 0; show(0); }
    if (hovering || mutating) return;
    reactPropsKey ??= Object.keys(valueEl).find(k => k.startsWith('__reactProps$'));
    const props = reactPropsKey ? (valueEl as any)[reactPropsKey] : null;
    let v: number;
    if (props?.rating100 !== undefined) {
      v = (props.rating100 / 100) * STAR_COUNT;
    } else {
      const raw = props?.value ?? props?.children ?? parseFloat(valueEl.textContent ?? '0');
      v = Number(raw) >= 10.5 ? (Number(raw) / 100) * STAR_COUNT : Number(raw);
    }
    if (!isNaN(pendingRating)) {
      if (!isNaN(v) && Math.abs(v - pendingRating) < 1e-6) { pendingRating = NaN; pendingAttempts = 0; }
      else if (++pendingAttempts > 20) { pendingRating = NaN; pendingAttempts = 0; }
      else return;
    }
    if (!isNaN(v) && v !== committed) { committed = v; show(committed); }
  };
  pollId = setInterval(sync, 300);
  sync();

  const getHoverValue = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-sr-btn]');
    if (!btn) return null;
    const idx = buttons.indexOf(btn);
    if (idx === -1) return null;
    const r = btn.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? idx + 0.5 : idx + 1;
  };

  const target = isDecimal ? btnParent : container;
  target.addEventListener('mousemove', (e: MouseEvent) => { hovering = true; show(getHoverValue(e) ?? committed, committed); });
  target.addEventListener('mouseleave', () => { hovering = false; show(committed); });
  target.addEventListener('click', async (e: MouseEvent) => {
    const v = getHoverValue(e);
    if (v === null) return;
    const clickedBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-sr-btn]');
    if (clickedBtn) { clickedBtn.classList.add('sr-pop'); clickedBtn.addEventListener('animationend', () => clickedBtn.classList.remove('sr-pop'), { once: true }); }
    const ratingToSend = Math.round((v / STAR_COUNT) * 100);
    const clearing = ratingToSend === Math.round((committed / STAR_COUNT) * 100);
    const prev = committed;
    committed = clearing ? 0 : v;
    show(committed);
    const info = getInfo();
    if (!info) return;
    mutating = true;
    try {
      const data = await gql(
        `mutation($i:${info.cfg.input}!){${info.cfg.update}(input:$i){id}}`,
        { i: { id: info.id, rating100: clearing ? null : ratingToSend } }
      );
      if (!data?.[info.cfg.update]) throw new Error();
      pendingRating = committed; pendingAttempts = 0;
    } catch {
      committed = prev; show(prev);
      pendingRating = NaN;
    } finally {
      mutating = false;
    }
  });
}

function init() {
  const rehideNative = () => {
    document.querySelectorAll<HTMLElement>('.rating-stars, .rating-number').forEach(c => {
      if (!replaced.has(c)) return;
      if (c.classList.contains('rating-number')) {
        Array.from(c.children).forEach(ch => {
          if (!(ch as HTMLElement).classList.contains('rating-stars'))
            (ch as HTMLElement).style.display = 'none';
        });
      } else {
        c.querySelectorAll<HTMLButtonElement>(':scope > button:not([data-sr-btn])').forEach(b => b.style.display = 'none');
      }
    });
  };

  const scan = () => {
    rehideNative();
    document.querySelectorAll<HTMLElement>('.star-rating-number, .rating-number').forEach(inject);
  };

  let scanScheduled = false;
  new MutationObserver(() => {
    if (!scanScheduled) { scanScheduled = true; requestAnimationFrame(() => { scanScheduled = false; scan(); }); }
  }).observe(document.body, { childList: true, subtree: true });
  scan();
}

init();
