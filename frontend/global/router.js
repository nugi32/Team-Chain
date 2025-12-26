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

    // 4. EXECUTE SCRIPTS FROM FETCHED HTML (works for production build)
    async function execScriptsFromDoc(doc) {
      const scripts = Array.from(doc.querySelectorAll('script'));
      const promises = [];

      for (const s of scripts) {
        const ns = document.createElement('script');
        if (s.type) ns.type = s.type;
        if (s.src) {
          ns.src = s.src;
          if (s.crossOrigin) ns.crossOrigin = s.crossOrigin;
          promises.push(new Promise((res, rej) => {
            ns.onload = res; ns.onerror = rej;
          }));
        } else {
          ns.textContent = s.textContent;
        }
        document.body.appendChild(ns);
      }

      // wait for external scripts to load
      await Promise.all(promises).catch(() => {});
    }

    // try dev-time dynamic import first (keeps existing behavior)
    currentPageModule = await loadPageJS(path);
    if (currentPageModule?.init) {
      currentPageModule.init();
    } else {
      // execute <script> tags found in the fetched HTML so bundled assets run
      await execScriptsFromDoc(doc);

      // production page scripts should set window.__PAGE_MODULE = { init, destroy }
      if (window.__PAGE_MODULE) {
        currentPageModule = window.__PAGE_MODULE;
        currentPageModule?.init?.();
        // clear global to avoid leaks on next navigation
        try { delete window.__PAGE_MODULE; } catch (e) { window.__PAGE_MODULE = undefined; }
      }
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

window.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname + location.search;

  // default route
  loadPage(path === "/" ? "/home" : path, true);
});
