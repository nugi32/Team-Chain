// global/ui-core.js
window.UI = {
  showLoading(text = "Processing...") {
    const el = document.getElementById("globalLoading");
    const txt = document.getElementById("loadingText");

    if (txt) txt.textContent = text;
    el?.classList.remove("hidden");
  },

  hideLoading() {
    document.getElementById("globalLoading")?.classList.add("hidden");
  }
};

window.Notify = {
  success(title, text) {
    Swal.fire({
      icon: "success",
      title,
      text,
      confirmButtonColor: "#00ffc8"
    });
  },

  error(text) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text
    });
  },

  info(text) {
    Swal.fire({
      icon: "info",
      title: "Please wait",
      text,
      showConfirmButton: false,
      allowOutsideClick: false
    });
  }
};
