// Cleared with removeAttribute, not src = ''. An empty src is not "no image":
// the browser resolves it against the current URL and requests the page itself
// as an image. That fired on every lightbox open and again on every close.
const lb = document.getElementById('lb') as HTMLDivElement | null;
const lbImg = document.getElementById('lb-img') as HTMLImageElement | null;
const lbCap = document.getElementById('lb-cap') as HTMLParagraphElement | null;
const lbX = document.getElementById('lb-x') as HTMLButtonElement | null;

if (lb && lbImg && lbCap && lbX) {
  document.querySelectorAll<HTMLImageElement>('img[data-artwork]').forEach((el) => {
    el.addEventListener('click', () => {
      lbImg.removeAttribute('src');
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
      lbImg.removeAttribute('src');
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
