/**
 * Pro Membership Discount Logic for React Cart
 * Surgically updates prices for Pro Members without breaking React.
 */
(function() {
  const DISCOUNT_PERCENT = 0.15;
  let isProcessing = false;
  let observer = null;
  
  function init() {
    const ctx = window.__SHOPIFY_CONTEXT__;
    const isPro = ctx && (ctx.isProMember || (ctx.tags && ctx.tags.includes('Pro Member')));
    if (!isPro) return;

    console.log('[ProDiscount] Initialising...');

    observer = new MutationObserver((mutations) => {
      if (isProcessing) return;
      
      // Check if any mutation was outside our own changes
      const hasExternalMutation = mutations.some(m => {
        return !m.target.closest || (!m.target.closest('.pro-discount-wrap') && !m.target.closest('.pro-checkout-notice'));
      });

      if (hasExternalMutation) {
        handleMutations();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    handleMutations();
  }

  function handleMutations() {
    if (isProcessing) return;
    
    const isCartPage = window.location.pathname.includes('/cart');
    const cartDrawer = document.querySelector('[role="dialog"], [class*="drawer"], [class*="Cart"]');
    const cartContainer = isCartPage ? document.body : cartDrawer;
    if (!cartContainer) return;

    isProcessing = true;
    
    try {
      // 1. Process Prices
      const walker = document.createTreeWalker(cartContainer, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const priceNodes = [];

      while(node = walker.nextNode()) {
        const text = node.textContent.trim();
        // Regex for price-like strings
        if (text.match(/^\$?\d+\.\d{2}$/) || (text.includes('$') && text.match(/\d/))) {
          // Skip if already in our wrapper
          if (!node.parentElement.closest('.pro-discount-wrap')) {
            priceNodes.push(node);
          }
        }
      }

      priceNodes.forEach(node => {
        const originalText = node.textContent.trim();
        const priceMatch = originalText.match(/\d+\.\d{2}/) || originalText.match(/\d+/);
        if (!priceMatch) return;

        const originalPrice = parseFloat(priceMatch[0]);
        if (isNaN(originalPrice) || originalPrice < 5) return; // Skip small numbers/quantities

        const discountedPrice = originalPrice * (1 - DISCOUNT_PERCENT);
        const currencySymbol = originalText.includes('$') ? '$' : '';
        const formattedOriginal = currencySymbol + originalPrice.toFixed(2);
        const formattedDiscounted = currencySymbol + discountedPrice.toFixed(2);

        // Surgically wrap the text node
        const span = document.createElement('span');
        span.className = 'pro-discount-wrap';
        span.style.display = 'inline-flex';
        span.style.flexWrap = 'wrap';
        span.style.alignItems = 'baseline';
        span.innerHTML = `
          <span style="text-decoration: line-through; opacity: 0.5; margin-right: 0.4em; font-size: 0.85em; font-weight: normal;">${formattedOriginal}</span>
          <span style="font-weight: 700; color: #16a34a;">${formattedDiscounted}</span>
        `;
        
        node.parentNode.replaceChild(span, node);
      });

      // 2. Summary & Notice
      injectSummary(cartContainer);
      injectNotice(cartContainer);

    } catch (e) {
      console.error('[ProDiscount] Error:', e);
    } finally {
      // Allow next cycle
      setTimeout(() => { isProcessing = false; }, 50);
    }
  }

  function injectSummary(container) {
    const labels = Array.from(container.querySelectorAll('div, span, p, h3'))
      .filter(el => {
        const t = el.textContent.toLowerCase().trim();
        return t === 'subtotal' || t === 'total' || t.includes('estimated total');
      });

    labels.forEach(label => {
      const parent = label.parentElement;
      if (!parent || parent.querySelector('.pro-savings-line')) return;

      const line = document.createElement('div');
      line.className = 'pro-savings-line';
      line.style.cssText = 'display:flex; justify-content:space-between; width:100%; color:#16a34a; font-size:0.85rem; margin:8px 0; font-weight:700; border-top:1px dashed #dcfce7; padding-top:8px;';
      line.innerHTML = `<span>Pro Discount (15%)</span><span>-15% Applied</span>`;
      parent.appendChild(line);
    });
  }

  function injectNotice(container) {
    const checkoutBtn = Array.from(container.querySelectorAll('button, a'))
      .find(el => el.textContent.toLowerCase().includes('checkout'));
    
    if (!checkoutBtn || container.querySelector('.pro-checkout-notice')) return;

    const notice = document.createElement('div');
    notice.className = 'pro-checkout-notice';
    notice.style.cssText = 'background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:10px; margin-bottom:12px; color:#166534; font-size:0.8rem; text-align:center;';
    notice.innerHTML = `<strong>✨ Pro Discount Active</strong><br>Savings finalized at checkout.`;

    checkoutBtn.parentNode.insertBefore(notice, checkoutBtn);
  }

  function debounce(func, wait) {
    let timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
