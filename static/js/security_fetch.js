/* REAL PHASE 8 — Security fetch helper
   Automatically attaches the CSRF token to same-origin unsafe requests. */
(function () {
  const meta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = meta ? meta.getAttribute('content') : '';
  if (!csrfToken || !window.fetch) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function secureFetch(input, init) {
    init = init || {};
    const method = (init.method || (input && input.method) || 'GET').toUpperCase();
    const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (unsafe) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const sameOrigin = !/^https?:\/\//i.test(url) || url.startsWith(window.location.origin);
      if (sameOrigin) {
        const headers = new Headers(init.headers || (input && input.headers) || {});
        if (!headers.has('X-CSRFToken')) headers.set('X-CSRFToken', csrfToken);
        init.headers = headers;
      }
    }
    return nativeFetch(input, init);
  };
})();
