export type Track = {
  number: string;
  title: string;
  meta: string;
  watchUrl?: string;
};

export const tracks: Track[] = [
  {
    number: '01',
    title: 'Momma Gone',
    meta: 'Folk · with Ashley · 2024',
  },
  {
    number: '02',
    title: 'Sega on a Saturday',
    meta: 'Folk · with Ashley · 2024',
  },
];

export const musicLinks = {
  substack: 'https://substack.com/@durrelllamar/notes',
  spotify: '',
  // The LamarCy channel. There is no DASH Creatives channel any more.
  youtube: 'https://www.youtube.com/channel/UC4DlhrOX8c8R83xqOGssqAA',
};

// Per-track watchUrl is intentionally unset. Both ids that were here --
// EdFSDXgwF4U and sIVn7xz0HoY -- are gone: the watch page says unavailable,
// oEmbed 404s and the thumbnail returns YouTube's grey 120x90 placeholder, so
// the page was showing a dead player and two dead Watch links. Put the real
// ids back here and the links and the embed return on their own.
