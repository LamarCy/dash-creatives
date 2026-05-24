const lb = document.getElementById('lb') as HTMLDivElement | null;
const lbImg = document.getElementById('lb-img') as HTMLImageElement | null;
const lbCap = document.getElementById('lb-cap') as HTMLParagraphElement | null;
const lbX = document.getElementById('lb-x') as HTMLButtonElement | null;

if (lb && lbImg && lbCap && lbX) {
  document.querySelectorAll<HTMLImageElement>('img[data-artwork]').forEach((el) => {
    el.addEventListener('click', () => {
      lbImg.src = '';
      lbCap.textContent = el.alt;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      const s = el.src;
      window.setTimeout(() => {
        lbImg.src = s;
      }, 30);
    });
  });

  const closeLb = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      lbImg.src = '';
    }, 300);
  };

  lbX.addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLb();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLb();
  });
}
