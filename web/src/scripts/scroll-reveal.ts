const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll<HTMLElement>('.t-item, .event-card, .shop-card, .track').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.1}s`;
  io.observe(el);
});
