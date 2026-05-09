export interface PortfolioItem {
  id: string;
  title: string;
  category: 'photography' | 'videography';
  type: string;
  imageUrl: string;
  videoUrl?: string; // Optional for videography
  description?: string;
}

export interface Profile {
  bio: string;
  experienceYear: number;
  cameraBody: string;
  lenses: string[];
  heroBgUrl: string;
  heroBgType: 'image' | 'video';
  heroTitle?: string;
  aboutImageUrl?: string;
}
