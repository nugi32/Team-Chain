export async function withUI(callback, options = {}) {
  const {
    loadingText = "Processing...",
    successMessage = null,
    errorMessage = "Something went wrong",
    silent = false
  } = options;

  try {
    if (!silent) {
      UI.showLoading(loadingText);
      Notify.info(loadingText);
    }

    const result = await callback();

    if (!silent) {
      //Swal.close();          // 🔥 WAJIB
      UI.hideLoading();
      if (successMessage) {
        Notify.success("Success", successMessage);
      }
    }

    return result;

  } catch (err) {
    console.error(err);
    if (!silent) {
      //Swal.close();          // 🔥 WAJIB
      UI.hideLoading();
      Notify.error(err.message || errorMessage);
    }
    throw err;
  }
}
