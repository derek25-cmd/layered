/**
 * Shopify Context Initializer
 * Reads context data from a JSON script tag to avoid inline scripts.
 */
(function() {
  const contextEl = document.getElementById('shopify-context-data');
  if (contextEl) {
    try {
      window.__SHOPIFY_CONTEXT__ = JSON.parse(contextEl.textContent);
    } catch (e) {
      console.error('[ShopifyContext] Failed to parse context data:', e);
    }
  }
})();
