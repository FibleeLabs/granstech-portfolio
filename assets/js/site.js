/* GransTech — site behaviour (no dependencies) */

/*
 * FORM DELIVERY
 * Leave FORM_ENDPOINT empty and the quote / careers forms open the visitor's
 * email app with the details pre-filled (addressed to data-mailto on the form).
 * To receive submissions directly instead, create a free form endpoint
 * (for example https://web3forms.com or https://formspree.io), paste the
 * endpoint URL below, and, for Web3Forms, put your access key in FORM_ACCESS_KEY.
 */
const FORM_ENDPOINT = '';
const FORM_ACCESS_KEY = '';

(function () {
  'use strict';

  // Header shadow once the page scrolls
  const header = document.getElementById('siteHeader');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile navigation
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
    header.querySelectorAll('.mobile-panel a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 1021px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  // Current year in the footer
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Reveal-on-scroll
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // Product lightbox
  const lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const img = lightbox.querySelector('img');
    const title = lightbox.querySelector('[data-lb-title]');
    const cat = lightbox.querySelector('[data-lb-cat]');
    document.querySelectorAll('.product button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fig = btn.closest('.product');
        const thumb = btn.querySelector('img');
        img.src = thumb.currentSrc || thumb.src;
        img.alt = thumb.alt;
        title.textContent = fig.querySelector('figcaption strong').textContent;
        cat.textContent = fig.querySelector('figcaption .mono').textContent;
        lightbox.showModal();
      });
    });
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  }

  // Product category navigation: highlight the section in view
  const catLinks = document.querySelectorAll('.cat-nav a[href^="#"]');
  if (catLinks.length && 'IntersectionObserver' in window) {
    const map = new Map();
    catLinks.forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) map.set(sec, a);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          catLinks.forEach((a) => a.classList.remove('is-active'));
          const link = map.get(entry.target);
          link.classList.add('is-active');
          link.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, sec) => spy.observe(sec));
  }

  // Quote and careers forms
  document.querySelectorAll('form[data-form]').forEach((form) => {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type="submit"]');
    const show = (type, msg) => {
      status.className = `form-status is-visible ${type}`;
      status.textContent = msg;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (form.querySelector('.hp-field input')?.value) return; // spam trap

      const data = new FormData(form);
      data.delete('website');

      if (FORM_ENDPOINT) {
        submit.disabled = true;
        const label = submit.innerHTML;
        submit.textContent = 'Sending...';
        if (FORM_ACCESS_KEY) data.append('access_key', FORM_ACCESS_KEY);
        data.append('subject', form.dataset.subject || 'Website enquiry');
        try {
          const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          form.reset();
          show('ok', form.dataset.success || 'Thank you. Your message has been sent and our team will be in touch shortly.');
        } catch (err) {
          show('err', `Sorry, the message could not be sent. Please email ${form.dataset.mailto} or call +91 94437 17080.`);
        } finally {
          submit.disabled = false;
          submit.innerHTML = label;
        }
        return;
      }

      // No endpoint configured: hand over to the visitor's email app
      const lines = [];
      form.querySelectorAll('input, select, textarea').forEach((field) => {
        if (!field.name || field.type === 'file' || field.closest('.hp-field')) return;
        const value = field.value.trim();
        if (!value) return;
        const label = form.querySelector(`label[for="${field.id}"]`);
        const name = label ? label.childNodes[0].textContent.trim() : field.name;
        lines.push(`${name}: ${value}`);
      });
      const subject = `${form.dataset.subject || 'Website enquiry'} - ${data.get('company') || data.get('name') || ''}`.trim();
      const href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n') + '\n')}`;
      window.location.href = href;
      const attach = form.querySelector('input[type="file"]') ? ' Please attach your file to that email before sending.' : '';
      show('ok', `Your email app should now open with the details filled in.${attach} If nothing opens, write to ${form.dataset.mailto}.`);
    });
  });
})();
