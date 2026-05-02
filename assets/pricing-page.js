/**
 * Pricing Page Logic
 * Refactored to avoid inline scripts for CSP compliance.
 */
(function() {
  // --- Data Loading ---
  const configEl = document.getElementById('pricing-page-config');
  const CONFIG = configEl ? JSON.parse(configEl.textContent) : {};
  const IS_PRO = CONFIG.isProMember || false;

  // --- Navbar JS ---
  (function() {
    var header     = document.getElementById('lp-header');
    var toggle     = document.getElementById('pr-menu-toggle');
    var mobileMenu = document.getElementById('pr-mobile-menu');
    var iconMenu   = document.getElementById('pr-icon-menu');
    var iconClose  = document.getElementById('pr-icon-close');

    function onScroll() {
      if (header) header.classList.toggle('lp-nav--scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function() {
        var isOpen = !mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', String(!isOpen));
        if (iconMenu)  iconMenu.classList.toggle('hidden');
        if (iconClose) iconClose.classList.toggle('hidden');
      });
    }
  })();

  // --- Scroll reveal ---
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // --- Pro activation dialog ---
  (function() {
    var PENDING_KEY = 'lp_pro_pending';
    var overlay  = document.getElementById('lp-pro-dialog');
    var closeBtn = document.getElementById('lp-dialog-close');
    var success  = document.getElementById('lp-dialog-success');
    var pending  = localStorage.getItem(PENDING_KEY);

    function openDialog(mode) {
      if (!overlay) return;
      document.getElementById('lp-dialog-success').style.display    = mode === 'success'    ? '' : 'none';
      document.getElementById('lp-dialog-activating').style.display = mode === 'activating' ? '' : 'none';
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeDialog() {
      if (!overlay) return;
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    if (overlay)  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDialog(); });

    if (pending) {
      localStorage.removeItem(PENDING_KEY);
      if (IS_PRO) {
        openDialog('success');
      } else {
        openDialog('activating');
        setTimeout(function() { window.location.reload(); }, 4500);
      }
    }
  })();

  // --- Pro upgrade → Shopify native checkout ---
  const CART_CREATE_MUTATION = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;

  function formatCheckoutUrl(u) {
    try {
      const url = new URL(u);
      url.searchParams.set('channel', 'online_store');
      return url.toString();
    } catch { return u; }
  }

  async function storefrontRequest(query, variables) {
    const cfg     = window.__layered_shopify || {};
    const domain  = cfg.domain  || (window.Shopify && window.Shopify.shop) || location.hostname;
    const token   = cfg.storefrontAccessToken || cfg.token || '';
    const version = cfg.apiVersion || '2024-07';

    const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error('Storefront API ' + res.status);
    return res.json();
  }

  async function createProCheckout(variantId) {
    const gid = variantId.startsWith('gid://')
      ? variantId
      : 'gid://shopify/ProductVariant/' + variantId;

    const data = await storefrontRequest(CART_CREATE_MUTATION, {
      input: { lines: [{ quantity: 1, merchandiseId: gid }] }
    });

    const errs = (data && data.data && data.data.cartCreate && data.data.cartCreate.userErrors) || [];
    if (errs.length) { console.error('[Layered] cartCreate errors:', errs); return null; }

    const checkoutUrl = data && data.data && data.data.cartCreate && data.data.cartCreate.cart && data.data.cartCreate.cart.checkoutUrl;
    return checkoutUrl ? formatCheckoutUrl(checkoutUrl) : null;
  }

  const upgradeBtn = document.getElementById('pr-upgrade-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', async function() {
      const variantId = upgradeBtn.dataset.variantId;

      if (!variantId) { window.location.href = '/collections/all'; return; }

      var label   = document.getElementById('pr-upgrade-label');
      var spinner = document.getElementById('pr-upgrade-spinner');
      upgradeBtn.disabled = true;
      if (label)   label.textContent = 'Preparing checkout…';
      if (spinner) spinner.classList.remove('hidden');

      try {
        var checkoutUrl = await createProCheckout(variantId);
        localStorage.setItem('lp_pro_pending', '1');
        window.location.href = checkoutUrl || ('/cart/' + variantId + ':1/checkout');
      } catch (err) {
        console.error('[Layered] Checkout creation failed:', err);
        localStorage.setItem('lp_pro_pending', '1');
        window.location.href = '/cart/' + variantId + ':1/checkout';
      }
    });
  }
})();
