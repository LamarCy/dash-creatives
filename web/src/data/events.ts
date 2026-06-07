export type EventItem = {
  month: string;
  day: string;
  name: string;
  where: string[];
  cta?: string;
};

export const events: EventItem[] = [
  {
    month: 'Past — 2022',
    day: 'I',
    name: 'American Soul American Soul',
    where: ['Vinings, Atlanta, GA', 'Solo Exhibition — Works by Durrell & Ashley Smith'],
  },
  {
    month: 'Past — 2023',
    day: 'II',
    name: 'American Soil American Soul',
    where: ['Grassroots Coffee Roasters', 'Thomasville, GA · Solo Exhibition'],
  },
  {
    month: 'Upcoming',
    day: '—',
    name: 'New Exhibition',
    where: ['Details forthcoming.', 'Inquire for exhibition opportunities.'],
    cta: 'Contact',
  },
];
