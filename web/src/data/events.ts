export type EventItem = {
  month: string;
  day: string;
  name: string;
  where: string[];
};

export const events: EventItem[] = [
  {
    month: 'May 2025',
    day: '04',
    name: 'Spring Open Studio',
    where: ['The Studio', 'Open to collectors & visitors'],
  },
  {
    month: 'Jun 2025',
    day: '18',
    name: 'Illustrated Folk Night',
    where: ['The Lantern Room', 'Live music & new prints'],
  },
  {
    month: 'Sep 2025',
    day: '12',
    name: 'Autumn Gallery Show',
    where: ['Millstone Gallery', 'New series debut'],
  },
];
