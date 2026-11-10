(() => {
  'use strict';
  const about = document.querySelector('main.about');
  if (!about) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const greeting = about.querySelector('.about__greeting');
  const lines = greeting ? [...greeting.querySelectorAll('span')] : [];
  const words = ['Hi,', 'I’m Gaurang Vank'];
  lines.forEach((line, i) => { line.textContent = words[i] || ''; });
  // Text is present by default; only hide it once the animation is ready.
  if (greeting && !reduced.matches) {
    greeting.setAttribute('aria-label', 'Hi, I’m Gaurang Vank');
    greeting.classList.add('is-typing');
    lines.forEach(line => { line.textContent = ''; line.setAttribute('aria-hidden', 'true'); });
    let lineIndex = 0, charIndex = 0;
    const type = () => {
      if (lineIndex >= lines.length) { greeting.classList.remove('is-typing'); return; }
      lines[lineIndex].textContent = words[lineIndex].slice(0, ++charIndex);
      if (charIndex >= words[lineIndex].length) { lineIndex++; charIndex = 0; }
      setTimeout(type, charIndex === 0 ? 220 : 65);
    };
    setTimeout(type, 1500);
  }

  const reveal = (element) => {
    element.dataset.visible = 'true';
    if (element.matches('.about__hand')) {
      const cards = [...element.querySelectorAll('.about__playcard')];
      cards.forEach((card, i) => {
        card.classList.remove('is-stacked');
        card.style.setProperty('--deal', `${i * 65}ms`);
        card.style.transform = `rotate(${(i - (cards.length - 1) / 2) * 10}deg) translateY(0) scale(1)`;
      });
    }
  };
  const targets = about.querySelectorAll('.about__text, .about__label, .about__hand, .roadmap__stop');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
  }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  targets.forEach(el => {
    el.classList.add('about-native-reveal');
    if (reduced.matches) reveal(el);
    else { el.dataset.visible = 'false'; observer.observe(el); }
  });

  about.querySelectorAll('.about__playcard').forEach(card => {
    card.addEventListener('click', () => {
      const selected = !card.classList.contains('is-picked');
      about.querySelectorAll('.about__playcard').forEach(other => {
        other.classList.remove('is-picked'); other.setAttribute('aria-pressed', 'false');
      });
      card.classList.toggle('is-picked', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
  });

  // Give the fan of tool cards a soft, pointer-led tilt without changing its layout.
  const hand = about.querySelector('.about__hand');
  if (hand && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced.matches) {
    const playcards = [...hand.querySelectorAll('.about__playcard')];
    let hovered = null;
    hand.addEventListener('pointermove', event => {
      const card = [...playcards].reverse().find(item => {
        const box = item.getBoundingClientRect();
        return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      });
      if (hovered !== card) {
        hovered?.classList.remove('is-hovered');
        hovered?.style.removeProperty('--rx');
        hovered?.style.removeProperty('--ry');
        hovered = card;
        hovered?.classList.add('is-hovered');
      }
      if (!card) return;
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
      card.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
    });
    const clearCardHover = () => {
      hovered?.classList.remove('is-hovered');
      hovered?.style.removeProperty('--rx');
      hovered?.style.removeProperty('--ry');
      hovered = null;
    };
    hand.addEventListener('pointerleave', clearCardHover);
    hand.addEventListener('focusin', event => event.target.closest('.about__playcard')?.classList.add('is-hovered'));
    hand.addEventListener('focusout', event => event.target.closest('.about__playcard')?.classList.remove('is-hovered'));
  }
  about.querySelectorAll('.roadmap__disc[aria-expanded]').forEach(button => {
    const stop = button.closest('.roadmap__stop');
    const set = open => { stop.classList.toggle('is-open', open); button.setAttribute('aria-expanded', String(open)); };
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
    stop.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') set(true); });
    stop.addEventListener('pointerleave', () => set(false));
    button.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  });

  const flow = about.querySelector('.about__flow');
  const cards = flow ? [...flow.querySelectorAll('.about__card')] : [];
  const cardTrack = flow?.querySelector('.about__cards');
  const body = about.querySelector('.about__body');
  const road = about.querySelector('.roadmap');
  const path = road?.querySelector('.roadmap__path');
  const stops = road ? [...road.querySelectorAll('.roadmap__disc')] : [];
  let roadLength = 0;
  const layoutRoad = () => {
    if (!road || !path || !stops.length) return;
    const width = road.clientWidth;
    const height = road.clientHeight;
    road.querySelector('.roadmap__line').setAttribute('viewBox', `0 0 ${width} ${height}`);
    road.querySelector('.roadmap__line').setAttribute('width', width);
    road.querySelector('.roadmap__line').setAttribute('height', height);
    const points = stops.map(dot => {
      let x = dot.offsetWidth / 2, y = dot.offsetHeight / 2;
      for (let node = dot; node && node !== road; node = node.offsetParent) {
        x += node.offsetLeft;
        y += node.offsetTop;
      }
      return { x, y };
    });
    let d = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((point, i) => {
      const previous = points[i];
      const middleY = (previous.y + point.y) / 2;
      d += ` C ${previous.x} ${middleY} ${point.x} ${middleY} ${point.x} ${point.y}`;
    });
    path.setAttribute('d', d);
    roadLength = path.getTotalLength();
    // Find each milestone along the curve so the ripple follows the line's tip.
    road._milestones = points.map(point => {
      let closest = 0, distance = Infinity;
      for (let i = 0; i <= 400; i++) {
        const length = roadLength * i / 400;
        const sample = path.getPointAtLength(length);
        const d = Math.hypot(sample.x - point.x, sample.y - point.y);
        if (d < distance) { distance = d; closest = length; }
      }
      return closest;
    });
    path.style.strokeDasharray = `${roadLength}`;
    path.style.strokeDashoffset = `${roadLength}`;
    road._roadPoints = points;
  };
  if (road) {
    layoutRoad();
    const roadResize = new ResizeObserver(layoutRoad);
    roadResize.observe(road);
    window.addEventListener('resize', layoutRoad, { passive: true });
  }
  let last = performance.now(), distance = 0;
  const frame = now => {
    const dt = Math.min(50, now - last); last = now;
    const w = innerWidth;
    if (flow && body && cardTrack && cards.length && !reduced.matches) {
      const rect = body.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) {
        flow.classList.add('about-native');
        distance += dt * .06;
        const spacing = cards[0].offsetWidth + Math.max(14, w * .015);
        const span = spacing * cards.length;
        const trackRect = cardTrack.getBoundingClientRect();
        const wave = [...flow.querySelectorAll('.about__wave')].find(item => item.getClientRects().length && getComputedStyle(item).display !== 'none');
        const wavePath = wave?.querySelector('path');
        const waveRect = wave?.getBoundingClientRect();
        const view = wave?.viewBox.baseVal;
        const length = wavePath?.getTotalLength() || 0;
        const samples = [];
        if (length && waveRect && view) {
          for (let i = 0; i <= 120; i++) {
            const p = wavePath.getPointAtLength(length * i / 120);
            samples.push({ x: waveRect.left - trackRect.left + (p.x - view.x) * waveRect.width / view.width, y: waveRect.top - trackRect.top + (p.y - view.y) * waveRect.height / view.height });
          }
        }
        cards.forEach((card, i) => {
          const x = ((i * spacing + distance) % span + span) % span - spacing;
          const center = x + card.offsetWidth / 2;
          let y = 0;
          if (samples.length) {
            let n = samples.findIndex(p => p.x >= center);
            if (n < 0) n = samples.length - 1;
            const a = samples[Math.max(0, n - 1)], b = samples[n];
            const t = Math.max(0, Math.min(1, (center - a.x) / (b.x - a.x || 1)));
            y = a.y + (b.y - a.y) * t - card.offsetHeight * .37;
          }
          card.style.transform = `translate3d(${x}px,${y}px,0)`;
          card.style.visibility = x < trackRect.width && x + card.offsetWidth > 0 ? 'visible' : 'hidden';
        });
      }
    }
    if (road) {
      const box = road.getBoundingClientRect();
      const progress = reduced.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .8 - box.top) / Math.max(1, box.height)));
      if (path && roadLength) {
        path.style.strokeDashoffset = `${roadLength * (1 - progress)}`;
        const milestones = road._milestones || [];
        let activeIndex = -1;
        milestones.forEach((length, i) => { if (length <= progress * roadLength) activeIndex = i; });
        stops.forEach((dot, i) => dot.closest('.roadmap__stop')?.toggleAttribute('data-trail-active', i === activeIndex));
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
