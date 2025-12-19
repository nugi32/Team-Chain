export async function withUI(callback, options = {}) {
  const {
    loadingText = "Processing...",
    successMessage = null,
    errorMessage = "Something went wrong",
    silent = false // 🔥 NEW
  } = options;

  try {
    if (!silent) {
      UI.showLoading(loadingText);
      Notify.info(loadingText);
    }

    const result = await callback();

    if (!silent) {
      UI.hideLoading();
      if (successMessage) {
        Notify.success("Success", successMessage);
      }
    }

    return result;

  } catch (err) {
    console.error(err);
    if (!silent) {
      UI.hideLoading();
      Notify.error(err.message || errorMessage);
    }
    throw err;
  }
}
