(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('site-local-ready');

  const script = document.currentScript;
  const fallbackImage = script ? new URL('../share.png', script.src).href : 'share.png';
  const brandImage = script ? new URL('./gaurang-logo.png', script.src).href : 'assets/gaurang-logo.png';

  // Replace visible name text in the static pages; retain accessible labels.
  const main = document.querySelector('main');
  if (main) {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const names = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue.includes('Gaurang Vank') && !node.parentElement.closest('script, style, svg, noscript, .about__greeting')) names.push(node);
    }
    names.forEach((node) => {
      const parts = node.nodeValue.split('Gaurang Vank');
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (part) fragment.appendChild(document.createTextNode(part));
        if (index < parts.length - 1) {
          const logo = document.createElement('img');
          logo.src = brandImage;
          logo.alt = 'Gaurang Vank';
          logo.className = 'brand-logo-inline';
          fragment.appendChild(logo);
        }
      });
      node.replaceWith(fragment);
    });
  }

  // Keep the live clock working without the original Next.js runtime.
  const clock = document.querySelector('.nav__clock');
  if (clock) {
    const fields = clock.querySelectorAll('span');
    const updateClock = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
      const day = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', weekday: 'long'
      }).format(now).toLowerCase();
      const date = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric'
      }).format(now).toLowerCase();
      if (fields[0]) fields[0].textContent = time;
      if (fields[1]) fields[1].textContent = day;
      if (fields[2]) fields[2].textContent = date;
    };
    updateClock();
    window.setInterval(updateClock, 1000);
  }

  // Restore the mobile menu when hydration is unavailable.
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#site-menu-panel');
  if (menuButton && menu) {
    const setMenu = (open) => {
      menuButton.setAttribute('aria-expanded', String(open));
      menu.dataset.open = String(open);
      if (open) menu.removeAttribute('inert');
      else menu.setAttribute('inert', '');
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  // Copy-email buttons work on HTTPS/localhost and on file:// via a safe fallback.
  document.querySelectorAll('.copy-email button, button.contact__email').forEach((button) => {
    button.addEventListener('click', async () => {
      const email = 'Gaurangvank@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
      } catch (_) {
        const field = document.createElement('textarea');
        field.value = email;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      button.dataset.copied = 'true';
      window.setTimeout(() => delete button.dataset.copied, 1600);
    });
  });

  // The archived React payload can restore social anchors during hydration.
  const removeInstagram = () => {
    document.querySelectorAll('a[href*="instagram.com/"]').forEach((link) => link.remove());
  };
  removeInstagram();
  new MutationObserver(removeInstagram).observe(document.body, { childList: true, subtree: true });

  // Broken image safety: preserve the layout and show the local share mark.
  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = 'true';
      image.classList.add('local-image-fallback');
      image.src = fallbackImage;
      const source = image.parentElement && image.parentElement.querySelector('source');
      if (source) source.remove();
    });
  });

  // Poster-only videos should look intentional instead of showing a disabled player.
  document.querySelectorAll('video').forEach((video) => {
    const frame = video.closest('.vrpo__film, .td__film, figure, section') || video.parentElement;
    if (!frame) return;
    const refreshVideoState = () => {
      const hasSource = Boolean(video.currentSrc || video.getAttribute('src') || video.querySelector('source[src]'));
      frame.classList.toggle('local-video-poster-only', !hasSource);
    };
    refreshVideoState();
    video.addEventListener('loadedmetadata', refreshVideoState);
    new MutationObserver(refreshVideoState).observe(video, {
      attributes: true,
      attributeFilter: ['src'],
      childList: true,
      subtree: true
    });

    const film = video.closest('.vrpo__film, .td__film');
    const toggle = film && film.querySelector('.td__toggle');
    const seek = film && film.querySelector('.td__seek-bar');
    if (film && toggle) {
      video.preload = 'metadata';
      const updatePlayback = () => {
        const paused = video.paused;
        toggle.toggleAttribute('data-paused', paused);
        toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${video.getAttribute('aria-label') || 'project video'}`);
      };
      toggle.addEventListener('click', async () => {
        try {
          if (video.paused) await video.play();
          else video.pause();
        } catch (error) {
          film.dataset.videoError = 'true';
          toggle.setAttribute('aria-label', 'Video could not be played');
          console.warn('Project video playback failed:', error);
        }
        updatePlayback();
      });
      video.addEventListener('play', updatePlayback);
      video.addEventListener('pause', updatePlayback);
      video.addEventListener('ended', updatePlayback);
      video.addEventListener('loadedmetadata', () => {
        if (!seek) return;
        seek.disabled = false;
        seek.max = String(video.duration || 0);
        seek.value = '0';
        const duration = video.duration || 0;
        const time = film.querySelector('.td__seek-time');
        if (time) {
          const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
          time.textContent = `0:00 / ${format(duration)}`;
          time.style.visibility = 'visible';
        }
      });
      video.addEventListener('timeupdate', () => {
        if (!seek || !video.duration) return;
        seek.value = String(video.currentTime);
        seek.style.setProperty('--seek', `${video.currentTime / video.duration * 100}%`);
        const time = film.querySelector('.td__seek-time');
        if (time) {
          const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
          time.textContent = `${format(video.currentTime)} / ${format(video.duration)}`;
        }
      });
      seek?.addEventListener('input', () => { if (video.duration) video.currentTime = Number(seek.value); });
      video.addEventListener('error', () => { film.dataset.videoError = 'true'; });
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      updatePlayback();
    }
  });

  // Project reels start as they enter view, pause off-screen, and replay forever.
  const reelObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= .25) {
        video.loop = true;
        video.muted = true;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: [.0, .25, .5] });
  document.querySelectorAll('.vrpo__film video, .td__film video').forEach((video) => reelObserver.observe(video));

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Restore the IKEA before/after range controls from the archived project UI.
  document.querySelectorAll('.ikeo__box').forEach((box) => {
    const handle = box.querySelector('.ikeo__handle[role="slider"]');
    if (!handle) return;
    let value = Number(handle.getAttribute('aria-valuenow')) || 50;
    const setSplit = next => {
      value = Math.max(0, Math.min(100, next));
      box.style.setProperty('--split', `${value}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(value)));
      handle.setAttribute('aria-valuetext', `${Math.round(value)}% old, ${100 - Math.round(value)}% new`);
    };
    const pointValue = event => {
      const rect = box.getBoundingClientRect();
      setSplit((event.clientX - rect.left) / rect.width * 100);
    };
    let dragging = false;
    box.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      box.dataset.dragging = '';
      box.setPointerCapture?.(event.pointerId);
      pointValue(event);
      event.preventDefault();
    });
    box.addEventListener('pointermove', event => { if (dragging) pointValue(event); });
    const stopDrag = () => { dragging = false; delete box.dataset.dragging; };
    box.addEventListener('pointerup', stopDrag);
    box.addEventListener('pointercancel', stopDrag);
    handle.addEventListener('keydown', event => {
      const step = event.shiftKey ? 10 : 2;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { setSplit(value - step); event.preventDefault(); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { setSplit(value + step); event.preventDefault(); }
      else if (event.key === 'Home') { setSplit(0); event.preventDefault(); }
      else if (event.key === 'End') { setSplit(100); event.preventDefault(); }
    });
    setSplit(value);
  });

  // The original About layout can remain in its pending state in a static mirror.
  const about = document.querySelector('main.about');
  if (about) {
    about.removeAttribute('data-intro');
    about.querySelectorAll('[data-typed="pending"]').forEach((element) => element.removeAttribute('data-typed'));
    const aboutFlow = about.querySelector('.about__flow');
    if (aboutFlow && !aboutFlow.classList.contains('is-live')) aboutFlow.classList.add('is-still');
  }

  // Scroll reveals for headings, cards and project-page sections.
  const revealTargets = document.querySelectorAll(
    '.archive__heading, .extras__heading, .card, .contact__in, .project section'
  );
  if (!reducedMotion && 'IntersectionObserver' in window) {
    root.classList.add('motion-enabled');
    revealTargets.forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((element) => observer.observe(element));
  }

  // Use native smooth scrolling for local hash links.
  document.querySelectorAll('a[href^="#"], a[href*="index.html#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      const hash = href && href.includes('#') ? href.slice(href.indexOf('#')) : href;
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', hash);
    });
  });
})();
