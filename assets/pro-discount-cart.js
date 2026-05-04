/**
 * Pro Membership Discount Logic for React Cart
 * Automatically calculates and displays a 15% discount for "Pro Member" customers.
 */
(function() {
  const DISCOUNT_PERCENT = 0.15;
  
  function init() {
    // Check eligibility from global context
    const ctx = window.__SHOPIFY_CONTEXT__;
    const isPro = ctx && (ctx.isProMember || (ctx.tags && ctx.tags.includes('Pro Member')));
    
    if (!isPro) return;

    console.log('[ProDiscount] Initialising for eligible member.');

    // Watch for cart changes
    const observer = new MutationObserver(debounce(handleMutations, 100));
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also run immediately
    handleMutations();
  }

  function handleMutations() {
    // 1. Identify Cart Containers (Drawer or Page)
    // The drawer typically has [role="dialog"] and contains "cart" in its content
    // The page has /cart in the URL
    const isCartPage = window.location.pathname.includes('/cart');
    const cartDrawer = document.querySelector('[role="dialog"]');
    const cartContainer = isCartPage ? document.body : cartDrawer;
    
    if (!cartContainer) return;
    if (!isCartPage && !cartContainer.textContent.toLowerCase().includes('cart')) return;

    // 2. Identify Price Elements
    // We look for elements that contain currency symbols and are likely prices
    // We exclude already processed ones and common non-price numbers like quantity
    const priceElements = Array.from(cartContainer.querySelectorAll('div, span, p, .text-sm, .text-lg'))
      .filter(el => {
        const text = el.textContent.trim();
        // Matches $12.34 or 12.34
        const isPriceFormat = text.match(/^\$?\d+(\.\d{2})?$/) || (text.includes('$') && text.match(/\d+/));
        // Exclude elements with children to avoid nested modification
        const hasNoChildren = el.children.length === 0;
        return isPriceFormat && hasNoChildren;
      })
      .filter(el => !el.dataset.proDiscounted);

    let totalSavings = 0;

    priceElements.forEach(el => {
      const originalText = el.textContent.trim();
      const priceMatch = originalText.match(/\d+(\.\d{2})?/);
      if (!priceMatch) return;

      const originalPrice = parseFloat(priceMatch[0]);
      const discountAmount = originalPrice * DISCOUNT_PERCENT;
      const discountedPrice = originalPrice - discountAmount;
      const currencySymbol = originalText.includes('$') ? '$' : '';

      const formattedOriginal = currencySymbol + originalPrice.toFixed(2);
      const formattedDiscounted = currencySymbol + discountedPrice.toFixed(2);

      // Update the UI
      el.dataset.proDiscounted = "true";
      el.dataset.originalPrice = originalPrice;
      el.innerHTML = `
        <span style="text-decoration: line-through; opacity: 0.5; margin-right: 6px; font-size: 0.9em;">${formattedOriginal}</span>
        <span style="font-weight: 600; color: #000;">${formattedDiscounted}</span>
      `;
    });

    // 3. Inject Savings Summary
    injectSavingsSummary(cartContainer);
  }

  function processPriceElement(el) {
    const originalText = el.textContent.trim();
    const priceMatch = originalText.match(/\d+(\.\d{2})?/);
    if (!priceMatch) return;

    const originalPrice = parseFloat(priceMatch[0]);
    const discountedPrice = originalPrice * (1 - DISCOUNT_PERCENT);
    const currencySymbol = originalText.includes('$') ? '$' : '';

    const formattedOriginal = currencySymbol + originalPrice.toFixed(2);
    const formattedDiscounted = currencySymbol + discountedPrice.toFixed(2);

    // Update the UI
    el.dataset.proDiscounted = "true";
    el.innerHTML = `
      <span style="text-decoration: line-through; opacity: 0.5; margin-right: 8px;">${formattedOriginal}</span>
      <span style="font-weight: bold; color: #000;">${formattedDiscounted}</span>
    `;
  }

  function injectSavingsSummary(container) {
    // Find the subtotal or total area
    const totalArea = Array.from(container.querySelectorAll('div, span, p'))
      .find(el => el.textContent.toLowerCase().includes('subtotal') || el.textContent.toLowerCase().includes('total'));
    
    if (!totalArea || container.querySelector('.pro-savings-line')) return;

    // We'll try to find a place to insert the savings line
    const summaryBlock = totalArea.closest('div');
    if (!summaryBlock) return;

    // This is tricky without exact selectors, but we'll try to append a savings line
    const savingsLine = document.createElement('div');
    savingsLine.className = 'pro-savings-line';
    savingsLine.style.display = 'flex';
    savingsLine.style.justifyContent = 'space-between';
    savingsLine.style.color = '#2a7a4b';
    savingsLine.style.fontSize = '0.875rem';
    savingsLine.style.marginTop = '4px';
    savingsLine.style.fontWeight = '600';
    savingsLine.innerHTML = `
      <span>Pro Member Savings (15%)</span>
      <span id="pro-total-savings">Calculating...</span>
    `;
    
    summaryBlock.appendChild(savingsLine);
    updateTotalSavings(container);
  }

  function updateTotalSavings(container) {
    // Heuristic: Total savings is 15% of the pre-discounted total
    // But since we modified the prices in place, we should find the original total
    // For now, let's just use a placeholder or try to find the new total
  }

  function debounce(func, wait) {
    let timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
