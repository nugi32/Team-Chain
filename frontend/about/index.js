
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

function onRegisterClick(e) {
  e.preventDefault();
  window.history.back();
}
