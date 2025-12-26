
  let back = null;

export function init() {
  back = document.getElementById("back");

  if (!back) return;

  back.addEventListener("click", onRegisterClick);
}

export function destroy() {
  if (back) {
    back.removeEventListener("click", onRegisterClick);
    back = null;
  }
}

if (typeof window !== 'undefined') {
  window.__PAGE_MODULE = {
    init: typeof init === 'function' ? init : undefined,
    destroy: typeof destroy === 'function' ? destroy : undefined
  };
}

function onRegisterClick(e) {
  e.preventDefault();
  window.history.back();
}
