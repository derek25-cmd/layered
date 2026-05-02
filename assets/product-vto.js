/**
 * Product Page Logic (Variants + Virtual Try-On)
 * Refactored to avoid inline scripts for CSP compliance.
 */
(function () {
  // --- Data Loading ---
  const variantsEl = document.getElementById('product-variants-data');
  const configEl   = document.getElementById('product-vto-config');
  
  if (!variantsEl) return;
  
  const VARIANTS = JSON.parse(variantsEl.textContent);
  const CONFIG   = configEl ? JSON.parse(configEl.textContent) : {};

  // --- Cached DOM references ---
  const mainImage    = document.getElementById('main-product-image');
  const priceEl      = document.getElementById('product-price');
  const variantIdSel = document.getElementById('variant-id');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const selects      = Array.from(document.querySelectorAll('.variant-select'));
  const thumbnails   = Array.from(document.querySelectorAll('.thumbnail-item'));
  const thumbnailStrip = document.getElementById('thumbnail-strip');

  // --- Helpers ---
  function baseUrl(url) {
    if (!url) return '';
    return url.split('?')[0];
  }

  function findVariantByOptions(optionValues) {
    return VARIANTS.find(v =>
      v.options.every((opt, i) => opt === optionValues[i])
    ) || null;
  }

  function applyVariant(variant) {
    if (!variant) return;

    if (variantIdSel) variantIdSel.value = variant.id;
    if (priceEl) priceEl.textContent = variant.price;

    if (addToCartBtn) {
      addToCartBtn.disabled = !variant.available;
      addToCartBtn.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
    }

    if (variant.image) {
      setMainImage(variant.image);
    }

    history.replaceState(null, '', window.location.pathname + '?variant=' + variant.id);
    highlightThumbnail(variant.image);
  }

  function setMainImage(url) {
    if (!url || !mainImage) return;
    mainImage.style.opacity = '0.6';
    mainImage.src = url;
    mainImage.onload = () => { mainImage.style.opacity = '1'; };
  }

  function highlightThumbnail(activeImageUrl) {
    const activeBase = baseUrl(activeImageUrl);
    thumbnails.forEach(thumb => {
      const thumbBase = baseUrl(thumb.dataset.imageUrl);
      const isActive  = activeBase && thumbBase === activeBase;
      thumb.classList.toggle('border-black', isActive);
      thumb.classList.toggle('border-transparent', !isActive);
    });
  }

  // --- Event: dropdown variant select ---
  selects.forEach(sel => {
    sel.addEventListener('change', () => {
      const chosen = selects.map(s => s.value);
      applyVariant(findVariantByOptions(chosen));
    });
  });

  // --- Event: thumbnail click ---
  if (thumbnailStrip) {
    thumbnailStrip.addEventListener('click', e => {
      const thumb = e.target.closest('.thumbnail-item');
      if (!thumb) return;

      const imageUrl  = thumb.dataset.imageUrl;
      const variantId = parseInt(thumb.dataset.variantId, 10);

      setMainImage(imageUrl);
      highlightThumbnail(imageUrl);

      if (variantId) {
        const variant = VARIANTS.find(v => v.id === variantId);
        if (variant) {
          selects.forEach((sel, i) => {
            if (variant.options[i] !== undefined) sel.value = variant.options[i];
          });
          applyVariant(variant);
          return;
        }
      }

      const matched = VARIANTS.find(v => baseUrl(v.image) === baseUrl(imageUrl));
      if (matched) {
        selects.forEach((sel, i) => {
          if (matched.options[i] !== undefined) sel.value = matched.options[i];
        });
        applyVariant(matched);
      }
    });
  }

  // --- Init ---
  (function init() {
    if (variantIdSel) {
      const selected = VARIANTS.find(v => v.id === parseInt(variantIdSel.value, 10));
      if (selected && selected.image) highlightThumbnail(selected.image);
    }
  })();

  // --- Virtual Try-On ---
  const SUPABASE_URL      = 'https://dteajctypikryqhoqrij.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZWFqY3R5cGlrcnlxaG9xcmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTcxMDIsImV4cCI6MjA5MzI5MzEwMn0.7o5WccE-1-MVgphufJIG8XoVtXLczcU1Wfgr3Vp0Tgc';
  const VTO_ENDPOINT      = SUPABASE_URL + '/functions/v1/virtual-tryon';

  const PRODUCT_TITLE = CONFIG.productTitle;
  const PRODUCT_TYPE  = CONFIG.productType;

  let VTO_CUSTOMER = CONFIG.customerEmail || '';
  let VTO_IS_PRO   = CONFIG.isProMember || false;

  (function() {
    if (VTO_CUSTOMER) return;
    var ctx = window.__SHOPIFY_CONTEXT__;
    if (ctx && ctx.customerEmail && ctx.customerEmail !== 'null' && ctx.customerEmail !== null) {
      VTO_CUSTOMER = ctx.customerEmail;
    }
  })();

  const vtoBtn           = document.getElementById('vto-generate-btn');
  const vtoFileInput     = document.getElementById('vto-user-image');
  const vtoLoading       = document.getElementById('vto-loading');
  const vtoResultWrap    = document.getElementById('vto-result-container');
  const vtoResultImg     = document.getElementById('vto-result-image');
  const vtoDownloadBtn   = document.getElementById('vto-download-btn');
  const vtoQuotaBadge    = document.getElementById('vto-quota-badge');
  const vtoUpgradePrompt = document.getElementById('vto-upgrade-prompt');

  let vtoQuotaExhausted = false;

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function applyQuota(quota) {
    if (!quota) return;
    const { remaining, limit, plan } = quota;
    if (vtoQuotaBadge) {
      vtoQuotaBadge.textContent = plan === 'pro'
        ? remaining + ' of ' + limit + ' left this month'
        : remaining + ' of ' + limit + ' free tries left';
    }
    if (remaining <= 0) {
      vtoQuotaExhausted = true;
      if (vtoBtn) vtoBtn.disabled = true;
      if (vtoUpgradePrompt && plan === 'free') vtoUpgradePrompt.classList.remove('hidden');
    }
  }

  function loadQuota() {
    if (!VTO_CUSTOMER) return;
    fetch(VTO_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
      body:    JSON.stringify({ customer_email: VTO_CUSTOMER, is_pro: VTO_IS_PRO, check_only: true })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { if (d.quota) applyQuota(d.quota); })
    .catch(function()  { if (vtoQuotaBadge) vtoQuotaBadge.textContent = '— / —'; });
  }

  function initGenerateButton() {
    if (!vtoBtn) return;
    vtoBtn.addEventListener('click', async () => {
      if (!vtoFileInput || !vtoFileInput.files || !vtoFileInput.files.length) {
        alert('Please upload your photo first.');
        return;
      }

      vtoBtn.disabled = true;
      vtoLoading.classList.remove('hidden');
      vtoResultWrap.classList.add('hidden');

      try {
        const photoBase64 = await fileToBase64(vtoFileInput.files[0]);

        const res = await fetch(VTO_ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
          body:    JSON.stringify({
            customer_email: VTO_CUSTOMER,
            is_pro:         VTO_IS_PRO,
            photo:          photoBase64,
            outfit: [{
              label: PRODUCT_TYPE || PRODUCT_TITLE,
              title: PRODUCT_TITLE,
              image: mainImage.src
            }]
          })
        });

        const data = await res.json();
        if (data.quota) applyQuota(data.quota);

        if (res.status === 429) {
          if (vtoUpgradePrompt && !VTO_IS_PRO) vtoUpgradePrompt.classList.remove('hidden');
          throw new Error(data.error || 'Generation limit reached.');
        }
        if (!res.ok)     throw new Error(data.error || 'Generation failed');
        if (!data.image) throw new Error('No image returned from server');

        vtoResultImg.src = data.image;
        vtoResultWrap.classList.remove('hidden');

        if (vtoDownloadBtn) {
          vtoDownloadBtn.classList.remove('hidden');
        }

      } catch (err) {
        console.error('VTO error:', err);
        alert(err.message || 'An error occurred. Please try again.');
      } finally {
        if (!vtoQuotaExhausted) vtoBtn.disabled = false;
        vtoLoading.classList.add('hidden');
      }
    });
  }
  
  if (vtoDownloadBtn) {
    vtoDownloadBtn.addEventListener('click', () => {
      if (!vtoResultImg || !vtoResultImg.src) return;
      const a    = document.createElement('a');
      a.href     = vtoResultImg.src;
      a.download = 'layered-tryon.png';
      a.click();
    });
  }

  // --- Async login gate (Robust Version) ---
  (async function initLoginGate() {
    var gate   = document.getElementById('vto-login-gate');
    var mainUI = document.getElementById('vto-main-ui');
    if (!gate || !mainUI) return;

    var ctx      = window.__SHOPIFY_CONTEXT__;
    var loggedIn = VTO_CUSTOMER !== '' || !!(ctx && ctx.isLoggedIn);

    // autoritative check if Liquid is stale
    if (!loggedIn) {
      try {
        var r = await fetch('/account', { cache: 'no-store' });
        // In Shopify, /account redirects to /account/login if not signed in.
        // redirected is true if follow happened. 
        loggedIn = r.ok && !r.redirected && !r.url.includes('/account/login');
      } catch (e) { console.error('[VTO] Login check failed:', e); }
    }

    // Update UI visibility
    if (loggedIn) {
      gate.style.display = 'none';
      mainUI.style.display = '';
    } else {
      gate.style.display = '';
      mainUI.style.display = 'none';
      return;
    }

    // If logged in but missing email/pro status (stale cache), try to recover from profile page
    if (!VTO_CUSTOMER) {
      try {
        var r = await fetch('/pages/profile', { cache: 'no-store' });
        if (r.ok) {
          var text = await r.text();
          var parser = new DOMParser();
          var doc = parser.parseFromString(text, 'text/html');
          var configEl = doc.getElementById('profile-page-config');
          if (configEl) {
            var config = JSON.parse(configEl.textContent);
            if (config.customerEmail && config.customerEmail !== 'null') {
              VTO_CUSTOMER = config.customerEmail;
              VTO_IS_PRO   = !!config.isProMember;
              console.log('[VTO] Recovered data from profile:', VTO_CUSTOMER, 'Pro:', VTO_IS_PRO);
            }
          }
        }
      } catch (e) { console.error('[VTO] Profile recovery failed:', e); }
    }

    // Final fallback: reload once if still missing email
    if (!VTO_CUSTOMER) {
      var reloadKey = 'vto_reload|' + location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        location.reload(true);
        return;
      }
      // If we are here, we are logged in but have no email.
      // Quota won't work, but we can't do much without email.
      return;
    }

    sessionStorage.removeItem('vto_reload|' + location.pathname);
    loadQuota();
    initGenerateButton();
  })();
})();
