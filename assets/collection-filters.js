/**
 * Collection Page Logic (Filters + Sorting)
 * Refactored to avoid inline scripts and event handlers.
 */
(function () {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards   = document.querySelectorAll('#product-grid .product-card');
  const sortSelect = document.getElementById('sort-select');

  // --- Category Filtering ---
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update button active state
      buttons.forEach(b => {
        const active = b === btn;
        b.classList.toggle('bg-black',    active);
        b.classList.toggle('text-white',  active);
        b.classList.toggle('border-black', active);
        b.classList.toggle('bg-white',    !active);
        b.classList.toggle('text-gray-700', !active);
        b.classList.toggle('border-gray-300', !active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      // Show/hide product cards
      let visibleCount = 0;
      cards.forEach(card => {
        const show = filter === 'All' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      // Empty state message
      const grid = document.getElementById('product-grid');
      const existingMsg = document.getElementById('filter-empty-msg');
      if (visibleCount === 0 && !existingMsg) {
        const msg = document.createElement('p');
        msg.id = 'filter-empty-msg';
        msg.className = 'col-span-full text-center text-gray-500 py-12';
        msg.textContent = 'No ' + filter + ' products found.';
        if (grid) grid.appendChild(msg);
      } else if (visibleCount > 0 && existingMsg) {
        existingMsg.remove();
      }
    });
  });

  // --- Sorting ---
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      window.location.href = window.location.pathname + '?sort_by=' + this.value;
    });
  }
})();
