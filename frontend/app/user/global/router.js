// ==========================
// CONFIG
// ==========================
const ROOT_SELECTOR = '.background';

// anti race-condition
let NAV_TOKEN = 0;

// lifecycle
let currentPageModule = null;

// ==========================
// HELPERS
// ==========================
function normalizePath(rawPath) {
  // pisahkan path & query string
  const [path, query] = rawPath.split('?');

  let normalized = path;
  if (!normalized.endsWith('.html')) {
    if (!normalized.endsWith('/')) normalized += '/';
    normalized += 'index.html';
  }

  return query ? `${normalized}?${query}` : normalized;
}

function getBaseDir(path) {
  return path.substring(0, path.lastIndexOf('/') + 1);
}

function resolvePageJS(pagePath) {
  return new URL('./index.js', window.location.origin + getBaseDir(pagePath)).href;
}

// ==========================
// CORE ROUTER
// ==========================
async function loadPage(rawPath, replace = false) {
  const myToken = ++NAV_TOKEN;

  try {
    const path = normalizePath(rawPath);

    // ==========================
    // 1. FETCH HTML
    // ==========================
    const resp = await fetch(path, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Failed to fetch ${path}`);

    const html = await resp.text();
    if (myToken !== NAV_TOKEN) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const newRoot = doc.querySelector(ROOT_SELECTOR);
    const currentRoot = document.querySelector(ROOT_SELECTOR);

    if (!newRoot || !currentRoot) {
      console.error('router: root not found', path);
      return;
    }

    // ==========================
    // 2. DESTROY PAGE LAMA
    // ==========================
    if (currentPageModule?.destroy) {
      currentPageModule.destroy();
      currentPageModule = null;
    }

    // ==========================
    // 3. SWAP HTML
    // ==========================
    currentRoot.innerHTML = newRoot.innerHTML;

    if (myToken !== NAV_TOKEN) return;

    // ==========================
    // 4. LOAD PAGE JS
    // ==========================
    const jsPath = resolvePageJS(path);

    currentPageModule = await import(jsPath);
    currentPageModule.init?.();

    // ==========================
    // 5. HISTORY
    // ==========================
    if (replace) {
      history.replaceState({ path: rawPath }, '', rawPath);
    } else {
      history.pushState({ path: rawPath }, '', rawPath);
    }

    window.scrollTo(0, 0);
    console.log('router: navigated to', rawPath);

  } catch (err) {
    console.error('router error:', err);
  }
}

// ==========================
// PUBLIC API
// ==========================
function go(path, replace = false) {
  if (!path.startsWith('/')) {
    console.warn('router: path harus absolut', path);
    return;
  }
  loadPage(path, replace);
}

window.go = go;

// ==========================
// BACK / FORWARD
// ==========================
window.addEventListener('popstate', e => {
  if (e.state?.path) {
    loadPage(e.state.path, true);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  // gabungkan pathname + query string
  const path = location.pathname + location.search;

  // default route
  loadPage(path === "/" ? "/home" : path, true);
});
