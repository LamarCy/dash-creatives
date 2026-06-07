export type EventItem = {
  month: string;
  day: string;
  name: string;
  where: string[];
};

export const events: EventItem[] = [
  {
    month: '2023',
    day: '—',
    name: 'American Soil American Soul',
    where: ['Grassroots Coffee Roasters', 'Thomasville, GA'],
  },
  {
    month: '2022',
    day: '—',
    name: 'American Soul American Soul',
    where: ['Vinings', 'Atlanta, GA'],
  },
  {
    month: 'Upcoming',
    day: '—',
    name: 'Details forthcoming',
    where: ['New exhibition in planning', 'Contact for inquiries'],
  },
];
