export const conferenceOverview = {
  name: 'IEEE SYSCON LATAM 2026',
  date: "December 3–4, 2026",
  location: 'Cartagena, Colombia',
  venue: "Conference venue to be confirmed",
  description:
    "The first IEEE Latin American Systems Conference: design, integration and management of complex systems, connecting academia, industry and government across Latin America.",
};

export const dashboardMetrics = [
  { label: "Total registrations", value: '1,248', delta: '+12.4%' },
  { label: "Accepted papers", value: '314', delta: '+7.8%' },
  { label: "Revenue collected", value: '$286,400', delta: '+18.1%' },
  { label: "Outstanding balances", value: '$41,300', delta: '-4.2%' },
];

export const adminTableRows = [
  {
    id: 'REG-1024',
    participant: 'Sofia Ramirez',
    type: "Author",
    papers: 2,
    paymentStatus: 'Partial',
  },
  {
    id: 'REG-1025',
    participant: 'David Kim',
    type: "Attendee",
    papers: 0,
    paymentStatus: 'Paid',
  },
  {
    id: 'REG-1026',
    participant: 'Nina Patel',
    type: "IEEE member",
    papers: 1,
    paymentStatus: 'Pending',
  },
];
