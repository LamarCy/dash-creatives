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
    watchUrl: 'https://www.youtube.com/watch?v=EdFSDXgwF4U',
  },
  {
    number: '02',
    title: 'Sega on a Saturday',
    meta: 'Folk · with Ashley · 2024',
    watchUrl: 'https://www.youtube.com/watch?v=sIVn7xz0HoY',
  },
];

export const musicLinks = {
  substack: 'https://substack.com/@durrelllamar/notes',
  spotify: '',
};
