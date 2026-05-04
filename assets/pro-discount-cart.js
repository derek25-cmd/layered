/**
 * Pro Membership Discount Logic for React Cart
 * Premium professional refinement with consistent styling.
 */
(function() {
  const DISCOUNT_PERCENT = 0.15;
  let isProcessing = false;
  
  function init() {
    const ctx = window.__SHOPIFY_CONTEXT__;
    const isPro = ctx && (ctx.isProMember || (ctx.tags && ctx.tags.includes('Pro Member')));
    if (!isPro) return;

    console.log('[ProDiscount] Initialising Premium Logic...');

    const observer = new MutationObserver((mutations) => {
      if (isProcessing) return;
      
      const hasExternalMutation = mutations.some(m => {
        return !m.target.closest || (
          !m.target.closest('.pro-discount-wrap') && 
          !m.target.closest('.pro-checkout-notice') && 
          !m.target.closest('.pro-savings-line')
        );
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
        if (text.match(/^\$?\d+\.\d{2}$/) || (text.includes('$') && text.match(/\d/))) {
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
        if (isNaN(originalPrice) || originalPrice < 5) return;

        const discountedPrice = originalPrice * (1 - DISCOUNT_PERCENT);
        const currencySymbol = originalText.includes('$') ? '$' : '';
        const formattedOriginal = currencySymbol + originalPrice.toFixed(2);
        const formattedDiscounted = currencySymbol + discountedPrice.toFixed(2);

        const span = document.createElement('span');
        span.className = 'pro-discount-wrap';
        span.innerHTML = `
          <span class="pro-original">${formattedOriginal}</span>
          <span class="pro-discounted">${formattedDiscounted}</span>
        `;
        
        node.parentNode.replaceChild(span, node);
      });

      // 2. Summary & Notice
      injectSummary(cartContainer);
      injectNotice(cartContainer);

    } catch (e) {
      console.error('[ProDiscount] Error:', e);
    } finally {
      setTimeout(() => { isProcessing = false; }, 100);
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
      line.innerHTML = `
        <span>Pro Member Savings (15%)</span>
        <span>-15% Applied</span>
      `;
      parent.appendChild(line);
    });
  }

  function injectNotice(container) {
    const checkoutBtn = Array.from(container.querySelectorAll('button, a'))
      .find(el => el.textContent.toLowerCase().includes('checkout'));
    
    if (!checkoutBtn || container.querySelector('.pro-checkout-notice')) return;

    const notice = document.createElement('div');
    notice.className = 'pro-checkout-notice';
    notice.innerHTML = `
      <div class="pro-checkout-notice-icon">✨</div>
      <div class="pro-checkout-notice-content">
        <b>Pro Membership Active</b>
        Your 15% member discount has been applied to all items.
      </div>
    `;

    checkoutBtn.parentNode.insertBefore(notice, checkoutBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
