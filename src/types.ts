export interface PortfolioItem {
  id: string;
  title: string;
  category: 'photography' | 'videography';
  type: string;
  imageUrl: string;
  videoUrl?: string; // Optional for videography
  description?: string;
}

export interface RateItem {
  id: string;
  title: string;
  price: string;
  features: string[];
  category: 'photography' | 'videography';
}

export interface ContactInfo {
  email: string;
  instagram: string;
  whatsapp: string;
  location: string;
}
