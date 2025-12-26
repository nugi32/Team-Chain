// ==========================
// CONFIG
// ==========================
/*
const ROOT_SELECTOR = '.background';

// anti race-condition
let NAV_TOKEN = 0;

// lifecycle
let currentPageModule = null;

// ==========================
// HELPERS
// ==========================
function normalizePath(rawPath) {
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

// ==========================
// LOAD PAGE JS
// ==========================
async function loadPageJS(path) {
  const cleanPath = path.split('?')[0];
  const jsUrl = getBaseDir(cleanPath) + 'index.js'; // e.g. '/home/index.js'

  try {
    return await import(jsUrl);
  } catch (err) {
    console.warn(`router: JS module not found for path ${jsUrl}`);
    return null;
  }
}

// ==========================
// CORE ROUTER
// ==========================
async function loadPage(rawPath, replace = false) {
  const myToken = ++NAV_TOKEN;

  try {
    const path = normalizePath(rawPath);

    // 1. FETCH HTML
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

    // 2. DESTROY CURRENT PAGE
    if (currentPageModule?.destroy) {
      currentPageModule.destroy();
      currentPageModule = null;
    }

    // 3. SWAP HTML
    currentRoot.innerHTML = newRoot.innerHTML;

    if (myToken !== NAV_TOKEN) return;

    // 4. LOAD PAGE JS
    currentPageModule = await loadPageJS(path);
    currentPageModule?.init?.();

    // 5. HISTORY
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
  const path = location.pathname + location.search;

  // default route
  loadPage(path === "/" ? "/home" : path, true);
});
*/

// ==========================
// CONFIG
// ==========================
const ROOT_SELECTOR = '.background';

// anti race-condition
let NAV_TOKEN = 0;

// lifecycle
let currentPageModule = null;

// ==========================
// AUTO IMPORT PAGE MODULES (VITE BUILD SAFE)
// ==========================
// Akan mengambil SEMUA file */index.js di project
const PAGE_MODULES = import.meta.glob('/**/index.js');

// ==========================
// HELPERS
// ==========================
function normalizePath(rawPath) {
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

// ==========================
// LOAD PAGE JS (BUILD SAFE)
// ==========================
async function loadPageJS(path) {
  const cleanPath = path.split('?')[0];
  const jsPath = getBaseDir(cleanPath) + 'index.js'; // e.g. '/home/index.js'

  const importer = PAGE_MODULES[jsPath];
  if (!importer) {
    console.warn(`router: JS module not found for ${jsPath}`);
    return null;
  }

  try {
    return await importer();
  } catch (err) {
    console.error(`router: failed loading ${jsPath}`, err);
    return null;
  }
}

// ==========================
// CORE ROUTER
// ==========================
async function loadPage(rawPath, replace = false) {
  const myToken = ++NAV_TOKEN;

  try {
    const path = normalizePath(rawPath);

    // 1. FETCH HTML
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

    // 2. DESTROY CURRENT PAGE
    if (currentPageModule?.destroy) {
      try {
        currentPageModule.destroy();
      } catch (e) {
        console.error('router: destroy error', e);
      }
      currentPageModule = null;
    }

    // 3. SWAP HTML
    currentRoot.innerHTML = newRoot.innerHTML;
    if (myToken !== NAV_TOKEN) return;

    // 4. LOAD PAGE JS
    currentPageModule = await loadPageJS(path);
    if (currentPageModule?.init) {
      currentPageModule.init();
    }

    // 5. HISTORY
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

// ==========================
// INITIAL LOAD
// ==========================
window.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname + location.search;
  loadPage(path === '/' ? '/home' : path, true);
});
