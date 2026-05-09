import { PortfolioItem } from './types';

export const portfolioData: PortfolioItem[] = [
  {
    id: '1',
    title: 'Urban Exploration',
    category: 'photography',
    type: 'Street Photography',
    imageUrl: 'https://picsum.photos/seed/urban/1200/1600',
    description: 'Capturing the raw energy of Jakarta streets.'
  },
  {
    id: '2',
    title: 'Modern Architecture',
    category: 'photography',
    type: 'Commercial',
    imageUrl: 'https://picsum.photos/seed/arch/1600/1200',
    description: 'Shadow and light in modern structures.'
  },
  {
    id: '3',
    title: 'Midnight Echoes',
    category: 'videography',
    type: 'Music Video',
    imageUrl: 'https://picsum.photos/seed/music/1600/900',
    videoUrl: '#', 
    description: 'Cinematic narrative for a local indie artist.'
  },
  {
    id: '4',
    title: 'The Wedding Day',
    category: 'videography',
    type: 'Wedding Highlight',
    imageUrl: 'https://picsum.photos/seed/wedding/1600/900',
    videoUrl: '#',
    description: 'Capturing eternal moments in motion.'
  },
  {
    id: '5',
    title: 'Portrait Series',
    category: 'photography',
    type: 'Personal Brand',
    imageUrl: 'https://picsum.photos/seed/portrait/1200/1500',
    description: 'Expressing personality through the lens.'
  },
  {
    id: '6',
    title: 'Corporate Identity',
    category: 'videography',
    type: 'Commercial',
    imageUrl: 'https://picsum.photos/seed/corp/1600/900',
    videoUrl: '#',
    description: 'Elevating brands through visual storytelling.'
  }
];
