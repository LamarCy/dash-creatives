export type Tier = {
  name: string;
  detail: string;
  priceLabel: string;
};

export const tiers: Tier[] = [
  { name: 'Sketch Study', detail: 'Ink on paper · 4–6 weeks', priceLabel: 'from 80' },
  { name: 'Watercolor or Gouache', detail: 'On paper · 8–10 weeks', priceLabel: 'from 80' },
  { name: "Collector's Original", detail: 'Mixed media assemblage · Gallery-quality · By inquiry', priceLabel: 'Inquire' },
  { name: 'Oil on Canvas', detail: 'Large-scale · By inquiry', priceLabel: 'Inquire' },
  { name: 'Book & Editorial', detail: 'Covers, interiors, spot illustration', priceLabel: 'Inquire' },
];
