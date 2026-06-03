/* =====================================================================
   FuSaLogix — script.js
   Vanilla. No deps. Respects prefers-reduced-motion.
===================================================================== */
(function(){
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ------------------------------------------------------------------
     Low-power detection.
     We flip <html class="low-power"> as early as possible so the CSS
     can strip expensive effects (backdrop-blur, big glows, continuous
     animations) on devices that would otherwise stutter.
  ------------------------------------------------------------------ */
  const lowPower = detectLowPower();
  if (lowPower) document.documentElement.classList.add('low-power');

  function detectLowPower(){
    try {
      const nav = navigator || {};
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      const memOk = (nav.deviceMemory == null) || nav.deviceMemory >= 4;       // GB
      const cpuOk = (nav.hardwareConcurrency == null) || nav.hardwareConcurrency >= 4;
      const saveData = !!(conn && conn.saveData);
      const slowNet = !!(conn && conn.effectiveType && /(^|\b)(2g|slow-2g)\b/i.test(conn.effectiveType));
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isNarrow = window.matchMedia('(max-width: 600px)').matches;
      // Coarse + narrow viewport is a strong "phone" signal; combined with any
      // weak hardware/network indicator, opt into the low-power path.
      const weakDevice = !memOk || !cpuOk || saveData || slowNet;
      return weakDevice || (isCoarse && isNarrow && !cpuOk);
    } catch (_) {
      return false;
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    setupYear();
    setupNav();
    setupReveals();
    setupStaticStats();   // Numbers render immediately; no count-up animation.
    setupActiveLink();
    setupContactForm();
    // Particle hero canvas removed — editorial typography carries the hero.
    // Lifecycle scroll-fill removed — replaced by the static V-model diagram.
  }

  /* Render data-count numbers immediately as final values (no animation). */
  function setupStaticStats(){
    $$('[data-count]').forEach(el => {
      const n = el.dataset.count;
      const suf = el.dataset.suffix || '';
      if (n != null) el.textContent = n + suf;
    });
  }

  /* ------------------------------------------------------------------
     Footer year
  ------------------------------------------------------------------ */
  function setupYear(){
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------
     Sticky nav: transparent → solid; mobile menu toggle
  ------------------------------------------------------------------ */
  function setupNav(){
    const nav = $('#nav');
    const toggle = $('#navToggle');
    const mobile = $('#navMobile');
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add('nav--scrolled');
      else nav.classList.remove('nav--scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });

    if (toggle && mobile){
      toggle.addEventListener('click', () => {
        const open = mobile.hasAttribute('hidden') ? false : true;
        if (open){
          mobile.setAttribute('hidden','');
          toggle.setAttribute('aria-expanded','false');
        } else {
          mobile.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded','true');
        }
      });
      mobile.addEventListener('click', e => {
        if (e.target.tagName === 'A'){
          mobile.setAttribute('hidden','');
          toggle.setAttribute('aria-expanded','false');
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     Active link highlighting based on section in view
  ------------------------------------------------------------------ */
  function setupActiveLink(){
    const links = $$('.nav__links a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach(a => {
      const id = a.getAttribute('href');
      if (id && id.startsWith('#')){
        const sec = document.querySelector(id);
        if (sec) map.set(sec, a);
      }
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const a = map.get(e.target);
        if (!a) return;
        if (e.isIntersecting){
          links.forEach(l => l.classList.remove('is-active'));
          a.classList.add('is-active');
        }
      });
    }, { rootMargin:'-45% 0px -50% 0px', threshold:0 });
    map.forEach((_, sec) => io.observe(sec));
  }

  /* ------------------------------------------------------------------
     Scroll-reveal
  ------------------------------------------------------------------ */
  function setupReveals(){
    const items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)){
      items.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting){
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });

    items.forEach((el, i) => {
      // tiny stagger so groups don't pop simultaneously
      el.style.transitionDelay = ((i % 6) * 60) + 'ms';
      io.observe(el);
    });

    // Case study metric bars — also use class hook
    $$('.case').forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Contact form
     Submits to Web3Forms (https://web3forms.com) via fetch.
     If the access_key is still the placeholder, falls back to a
     mailto: handoff so the form is useful from day one.
  ------------------------------------------------------------------ */
  function setupContactForm(){
    const form    = $('#contactForm');
    const submit  = $('#contactSubmit');
    const status  = $('#contactStatus');
    if (!form || !submit || !status) return;

    const PLACEHOLDER_KEY = 'WEB3FORMS_ACCESS_KEY';
    const FALLBACK_TO = 'contact@fusalogix.com';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Native + lightweight custom validation pass
      $$('.field.is-invalid', form).forEach(el => el.classList.remove('is-invalid'));
      let firstBad = null;
      $$('input, textarea, select', form).forEach(el => {
        if (el.required && !String(el.value).trim()){
          el.closest('.field')?.classList.add('is-invalid');
          if (!firstBad) firstBad = el;
        } else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)){
          el.closest('.field')?.classList.add('is-invalid');
          if (!firstBad) firstBad = el;
        }
      });
      if (firstBad){
        setStatus('Please complete the highlighted fields.', 'is-err');
        firstBad.focus();
        return;
      }

      // Honeypot trip → silently succeed (do nothing the bot can detect)
      const honey = form.querySelector('input[name="botcheck"]');
      if (honey && honey.checked){
        setStatus('Thanks — we&rsquo;ll be in touch.', 'is-ok');
        form.reset();
        return;
      }

      const fd = new FormData(form);
      const accessKey = fd.get('access_key');

      // If the site owner hasn't pasted a real access key yet, fall back to mailto
      if (!accessKey || accessKey === PLACEHOLDER_KEY){
        openMailtoFallback(fd);
        setStatus('Opening your email client… If nothing opens, please email ' + FALLBACK_TO + '.', 'is-ok');
        return;
      }

      setBusy(true);
      setStatus('Sending your request…', 'is-busy');

      try{
        const res = await fetch(form.action, {
          method:'POST',
          body: fd,
          headers: { 'Accept':'application/json' }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success === true || data.success === undefined)){
          setStatus('Thank you. A FuSaLogix engineer will respond within one business day.', 'is-ok');
          form.reset();
        } else {
          throw new Error(data && data.message ? data.message : 'Submission failed');
        }
      } catch (err){
        // Network failure / endpoint down → graceful mailto fallback
        openMailtoFallback(fd);
        setStatus('We couldn&rsquo;t reach the form server. Your email client should now be open — or email ' + FALLBACK_TO + '.', 'is-err');
      } finally {
        setBusy(false);
      }
    });

    function setBusy(busy){
      submit.disabled = busy;
      submit.style.opacity = busy ? '.7' : '';
      submit.style.cursor  = busy ? 'wait' : '';
    }
    function setStatus(html, cls){
      status.className = 'form-status ' + (cls || '');
      status.innerHTML = html;
    }
    function openMailtoFallback(fd){
      const lines = [
        'Name: '    + (fd.get('name')    || ''),
        'Company: ' + (fd.get('company') || ''),
        'Email: '   + (fd.get('email')   || ''),
        'Phone: '   + (fd.get('phone')   || ''),
        'Topic: '   + (fd.get('topic')   || ''),
        '',
        'Message:',
        fd.get('message') || ''
      ].join('\n');
      const url = 'mailto:' + FALLBACK_TO
        + '?subject=' + encodeURIComponent('FuSaLogix Consultation Request')
        + '&body='    + encodeURIComponent(lines);
      window.location.href = url;
    }
  }

})();
