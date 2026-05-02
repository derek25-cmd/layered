/**
 * Profile Page Logic
 * Refactored to avoid inline scripts and event handlers.
 */
(function() {
  // --- Data Loading ---
  const configEl = document.getElementById('profile-page-config');
  const CONFIG = configEl ? JSON.parse(configEl.textContent) : {};
  const IS_PRO = CONFIG.isProMember || false;

  // --- Navbar JS ---
  (function() {
    var header     = document.getElementById('lp-header');
    var toggle     = document.getElementById('pf-menu-toggle');
    var mobileMenu = document.getElementById('pf-mobile-menu');
    var iconMenu   = document.getElementById('pf-icon-menu');
    var iconClose  = document.getElementById('pf-icon-close');

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

  // --- Pro activation dialog ---
  (function() {
    var overlay  = document.getElementById('lp-pro-dialog');
    var closeBtn = document.getElementById('lp-dialog-close');

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

    var pending = localStorage.getItem('lp_pro_pending');
    if (pending) {
      localStorage.removeItem('lp_pro_pending');
      if (IS_PRO) {
        openDialog('success');
      } else {
        openDialog('activating');
        setTimeout(function() { window.location.reload(); }, 4500);
      }
    }
  })();

  // --- Scroll reveal ---
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // --- Style preferences ---
  const PREFS_KEY = 'layered_style_prefs';
  const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '[]');

  document.querySelectorAll('.pf-pref-btn').forEach(btn => {
    if (saved.includes(btn.dataset.cat)) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      btn.classList.toggle('bg-white');
      btn.classList.toggle('text-black');
      btn.classList.toggle('border-white');
    });
  });

  document.getElementById('pf-save-prefs')?.addEventListener('click', () => {
    const active = [...document.querySelectorAll('.pf-pref-btn')]
      .filter(b => b.classList.contains('active'))
      .map(b => b.dataset.cat);
    localStorage.setItem(PREFS_KEY, JSON.stringify(active));
    const msg = document.getElementById('pf-prefs-saved');
    if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 2000); }
  });

  // --- Saved outfit builds ---
  const container = document.getElementById('pf-outfits-list');
  if (container) {
    try {
      const raw = localStorage.getItem('layered-outfit');
      const outfitState = raw ? JSON.parse(raw) : null;
      const slots = outfitState?.state?.slots || {};
      const filled = Object.entries(slots).filter(([, v]) => v && v.product);

      if (filled.length === 0) {
        container.innerHTML = `<p class="lp-body-muted">No saved blueprints found in the current session. <a href="/outfits/build" class="pf-build-link">Start a new build →</a></p>`;
      } else {
        let html = '<div class="lp-outfit-grid">';
        filled.forEach(([slot, v]) => {
          const img   = v.product?.node?.images?.edges?.[0]?.node?.url || '';
          const title = v.product?.node?.title || slot;
          const label = slot.charAt(0).toUpperCase() + slot.slice(1);
          html += `<div class="lp-outfit-card">
            <div class="lp-outfit-card-image">
              ${img
                ? `<img src="${img}" alt="${title}">`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:rgba(14,14,14,0.25);font-weight:700">${label}</div>`
              }
            </div>
            <p class="lp-outfit-label">${label}</p>
            <p class="lp-outfit-title">${title}</p>
          </div>`;
        });
        html += '</div>';
        html += '<a href="/outfits/build" class="lp-reconfigure-btn">Reconfigure Build →</a>';
        container.innerHTML = html;
      }
    } catch(e) {
      container.innerHTML = '<p class="lp-body-muted">Archive retrieval failed.</p>';
    }
  }
})();
