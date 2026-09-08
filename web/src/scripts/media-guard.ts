/* ---------------------------------------------------------------------------
   media-guard — casual-copy deterrence for the artwork and the players.

   WHAT THIS DOES
   Removes the one-click routes to a local copy: right-click "Save image as",
   drag-to-desktop, and the iOS long-press save sheet.

   WHAT THIS CANNOT DO — and no web code can
   Stop a screenshot, or stop someone lifting the file out of the network tab
   or the browser's disk cache. Both happen below the page, where scripts have
   no reach. If a browser rendered it, the visitor already has the bytes.
   This is a speed bump for casual visitors, not protection for the work. The
   measures that actually protect it are watermarking, publishing display
   resolution rather than masters, and the copyright notice + DMCA route.

   DELIBERATELY NOT DONE
   Blocking text selection sitewide, and trapping devtools / keyboard
   shortcuts. Both are bypassed in seconds, both break accessibility and
   ordinary browser behaviour (copying an email address, a screen reader
   walking the page), and they make the site feel hostile to exactly the
   collectors and curators it is meant to invite in. The cost is real and the
   protection is illusory, so they are left out on purpose. Please don't add
   them later without re-reading this note.
--------------------------------------------------------------------------- */

/* #lb-img is the lightbox, which shows the largest copy on the site and is
   created before this runs — hence delegation on document rather than
   per-element listeners. */
const GUARDED = 'img, picture, canvas, video, audio, [data-artwork], #lb-img';

const guarded = (t: EventTarget | null): boolean =>
  t instanceof Element && t.closest(GUARDED) !== null;

document.addEventListener('contextmenu', (e) => {
  if (guarded(e.target)) e.preventDefault();
});

document.addEventListener('dragstart', (e) => {
  if (guarded(e.target)) e.preventDefault();
});
