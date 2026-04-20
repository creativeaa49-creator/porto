import { PortfolioItem, RateItem } from './types';

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

export const rateCardData: RateItem[] = [
  {
    id: 'p1',
    title: 'Basic Portrait',
    price: 'IDR 1,500K',
    category: 'photography',
    features: ['1 Hour Session', '10 Edited Photos', '1 Location', 'Online Gallery']
  },
  {
    id: 'p2',
    title: 'Commercial Brand',
    price: 'IDR 4,500K',
    category: 'photography',
    features: ['4 Hour Session', '30 Edited Photos', 'Product & Interior', 'High-Res Delivery']
  },
  {
    id: 'v1',
    title: 'Social Media Edit',
    price: 'IDR 2,500K',
    category: 'videography',
    features: ['15-30s Reels', 'Vertical Format', 'Motion Graphics', 'Trendy Audio']
  },
  {
    id: 'v2',
    title: 'Cinematic Highlight',
    price: 'IDR 7,500K',
    category: 'videography',
    features: ['3-5 Min Video', '4K Quality', 'Color Grading', 'Sound Design']
  }
];
