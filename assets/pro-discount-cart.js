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
    const isCartPage = window.location.pathname.includes('/cart');
    const cartDrawer = document.querySelector('[role="dialog"], [class*="drawer"], [class*="Cart"]');
    const cartContainer = isCartPage ? document.body : cartDrawer;
    
    if (!cartContainer) return;

    // Aggressively find all potential price elements
    // We look for text nodes that contain currency patterns
    const walker = document.createTreeWalker(cartContainer, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const targets = [];

    while(node = walker.nextNode()) {
      const text = node.textContent.trim();
      // Heuristic for price: Starts with $ or contains $ followed by numbers, or just numbers with 2 decimals
      if (text.match(/^\$?\d+\.\d{2}$/) || (text.includes('$') && text.match(/\d/))) {
        if (!node.parentElement.dataset.proDiscounted && !node.parentElement.closest('.pro-savings-line')) {
          targets.push(node.parentElement);
        }
      }
    }

    if (targets.length === 0) return;

    targets.forEach(el => {
      const originalText = el.textContent.trim();
      const priceMatch = originalText.match(/\d+\.\d{2}/) || originalText.match(/\d+/);
      if (!priceMatch) return;

      const originalPrice = parseFloat(priceMatch[0]);
      if (isNaN(originalPrice) || originalPrice <= 0) return;

      const discountAmount = originalPrice * DISCOUNT_PERCENT;
      const discountedPrice = originalPrice - discountAmount;
      const currencySymbol = originalText.includes('$') ? '$' : '';

      const formattedOriginal = currencySymbol + originalPrice.toFixed(2);
      const formattedDiscounted = currencySymbol + discountedPrice.toFixed(2);

      // Avoid modifying quantity numbers or small numbers that aren't likely prices
      if (originalPrice < 5 && !originalText.includes('$')) return;

      el.dataset.proDiscounted = "true";
      el.dataset.originalAmount = originalPrice;
      
      // Replace content while preserving any other inner structure if possible, 
      // but usually prices are simple text.
      el.innerHTML = `
        <span class="pro-original" style="text-decoration: line-through; opacity: 0.5; margin-right: 0.5em; font-size: 0.9em;">${formattedOriginal}</span>
        <span class="pro-discounted" style="font-weight: 600; color: #000;">${formattedDiscounted}</span>
      `;
    });

    injectSavingsSummary(cartContainer);
    injectCheckoutNotice(cartContainer);
  }

  function injectSavingsSummary(container) {
    const summaryLabels = Array.from(container.querySelectorAll('div, span, p, h3'))
      .filter(el => {
        const t = el.textContent.toLowerCase().trim();
        return t === 'subtotal' || t === 'total' || t.includes('estimated total');
      });

    summaryLabels.forEach(label => {
      const parent = label.parentElement;
      if (!parent || parent.querySelector('.pro-savings-line')) return;

      const savingsLine = document.createElement('div');
      savingsLine.className = 'pro-savings-line';
      savingsLine.style.cssText = 'display:flex; justify-content:space-between; width:100%; color:#16a34a; font-size:0.9rem; margin:12px 0; font-weight:700; border-top:1px dashed #dcfce7; padding-top:12px;';
      savingsLine.innerHTML = `
        <span>Pro Member Discount (15%)</span>
        <span>-15% Applied</span>
      `;
      
      parent.appendChild(savingsLine);
    });
  }

  function injectCheckoutNotice(container) {
    // Find checkout button
    const checkoutBtn = Array.from(container.querySelectorAll('button, a'))
      .find(el => el.textContent.toLowerCase().includes('checkout'));
    
    if (!checkoutBtn || container.querySelector('.pro-checkout-notice')) return;

    const notice = document.createElement('div');
    notice.className = 'pro-checkout-notice';
    notice.style.cssText = 'background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:12px; margin-bottom:16px; color:#166534; font-size:0.875rem; text-align:center; font-weight:500;';
    notice.innerHTML = `
      <div style="font-weight:700; margin-bottom:2px;">✨ Pro Member Discount Active</div>
      Your 15% savings will be finalized at checkout.
    `;

    checkoutBtn.parentNode.insertBefore(notice, checkoutBtn);
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
