let registerBtn = null;

export function init() {
  registerBtn = document.getElementById("Register");

  if (!registerBtn) return;

  registerBtn.addEventListener("click", onRegisterClick);
}

export function destroy() {
  if (registerBtn) {
    registerBtn.removeEventListener("click", onRegisterClick);
    registerBtn = null;
  }
}

function onRegisterClick(e) {
  e.preventDefault();
  go("/user/Register");
}
