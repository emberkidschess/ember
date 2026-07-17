import type {
  Course,
  RoadmapPhase,
  ProdigySpotlight,
  ProdigyCard,
  Testimonial,
  SiteProfile,
  SocialLink,
  SiteConfigResponse,
} from '../types';

/**
 * Fallback content shown on the public marketing site before an admin has
 * populated the corresponding collection via the CMS. Each get* controller
 * falls back to these defaults when the collection query returns zero
 * documents, so the public site is never empty on a fresh deploy.
 */

export const defaultCourses: Course[] = [
  {
    level: 'Level 01',
    title: 'Beginner',
    subtitle: 'The Logic Core',
    desc: 'Perfect for absolute beginners. Build a rock-solid base by understanding the language and rules of chess.',
    topics: ['Piece Movement & Values', 'Board Geometry & Notation', 'Basic Checkmates', 'Opening Principles'],
    accent: 'border-blue-400',
    badgeColor: 'bg-blue-50 text-blue-700',
    isPremium: false,
  },
  {
    level: 'Level 02',
    title: 'Intermediate',
    subtitle: 'Tactical Vision',
    desc: 'Move beyond basic moves. Learn to identify patterns, create threats, and calculate short sequences.',
    topics: ['Tactical Motifs (Pins, Forks)', 'Endgame Precision', 'Positional Evaluation', 'Calculation Training'],
    accent: 'border-[var(--color-pine)]',
    badgeColor: 'bg-green-50 text-[var(--color-pine)]',
    isPremium: false,
  },
  {
    level: 'Level 03',
    title: 'Advanced',
    subtitle: 'Strategic Mastery',
    desc: "Think like a master. Anticipate your opponent's plans and build long-term winning strategies.",
    topics: ['Prophylactic Thinking', 'Complex Middlegame Plans', 'Pawn Structure Nuances', 'Candidate Moves'],
    accent: 'border-[var(--color-ember)]',
    badgeColor: 'bg-orange-50 text-[var(--color-ember)]',
    isPremium: false,
  },
  {
    level: 'Level 04',
    title: 'Expert',
    subtitle: 'Tournament Excellence',
    desc: 'Elite training for competitive players aiming for state and national level dominance.',
    topics: ['Opening Repertoire Building', 'GM Game Analysis', 'Psychological Warfare', 'Advanced Time Management'],
    accent: 'border-[var(--color-gold)]',
    badgeColor: 'bg-amber-50 text-amber-700',
    isPremium: true,
  },
];

export const defaultRoadmap: RoadmapPhase[] = [
  {
    phase: 'Month 1–3',
    title: 'The Awakening',
    rating: '0–400 Elo',
    outcome: 'Student recognises tactical patterns instantly and plays games without illegal moves.',
    iconName: 'Compass',
    color: 'text-blue-500',
    bg: 'bg-blue-500/5',
  },
  {
    phase: 'Month 4–9',
    title: 'Tactical Sharpness',
    rating: '400–1000 Elo',
    outcome: 'Capable of calculating 3–4 moves ahead. Begins participating in local tournaments.',
    iconName: 'Shield',
    color: 'text-emerald-600',
    bg: 'bg-emerald-600/5',
  },
  {
    phase: 'Month 10–18',
    title: 'Strategic Dominance',
    rating: '1000–1400 Elo',
    outcome: 'Understands pawn structures, deep positional play, starts beating casual adult players.',
    iconName: 'Zap',
    color: 'text-orange-500',
    bg: 'bg-orange-500/5',
  },
  {
    phase: 'Beyond 18 Months',
    title: 'The Rated Competitor',
    rating: '1400+ FIDE',
    outcome: 'Official chess rating. Advanced prep for State & National Championships.',
    iconName: 'Crown',
    color: 'text-amber-500',
    bg: 'bg-amber-500/5',
  },
];

export const defaultSpotlight: ProdigySpotlight = {
  name: 'Balamithran Vijay',
  age: 'Young Chess Champion',
  title: 'London Chess Club Junior Tournament Winner',
  image: '/images/bala.jpg',
  story: 'Balamithran joined our academy with a passion for chess and a dream to compete at the highest level. Through dedicated training, consistent practice, and strategic guidance, he developed exceptional tactical skills and positional understanding. His outstanding performance of 6.5/7 at the London Chess Club Junior Tournament, achieving a tournament rating of 1175, is a testament to his hard work and determination. His journey inspires all young chess enthusiasts at our academy.',
  achievements: [
    '🥇 1st Place — London Chess Club Junior Tournament',
    'Outstanding Performance — 6.5/7 points',
    'Tournament Rating — 1175',
    'Consistent dedication and improvement',
  ],
};

export const defaultProdigies: ProdigyCard[] = [
  {
    name: 'Monica Jangid',
    age: '8 Years Old',
    milestone: 'National Qualifier',
    image: '/images/ana3.png',
    snippet: 'Mastered endgame theory in record time. Currently youngest player in the city top 20.',
  },
  {
    name: 'Kabir Malhotra',
    age: '9 Years Old',
    milestone: 'FIDE Rated Competitor',
    image: '/images/ana2.png',
    snippet: 'Known for deep prophylactic thinking. Recently went undefeated in the District Open.',
  },
  {
    name: 'Rohan Deshmukh',
    age: '10 Years Old',
    milestone: 'School Board Gold Medalist',
    image: '/images/rohan1.jpeg',
    snippet: 'Aggressive tactical playstyle. Solves complex tactical puzzles in under 30 seconds.',
  },
  {
    name: 'Meera Joshi',
    age: '8 Years Old',
    milestone: 'State Girls Runner-Up',
    image: '/images/ana.png',
    snippet: 'Exceptional tournament endurance. Overcame a major disadvantage to win her last tournament.',
  },
];

export const defaultTestimonials: Testimonial[] = [
  {
    quote: 'The classes gave my child more than chess skills. He is calmer during problems, plans before acting, and looks forward to every session.',
    name: 'Priya Sharma',
    role: 'Parent of Aarav, Age 8',
    imageUrl: '/images/test1.jpeg',
  },
  {
    quote: 'Tournament preparation used to feel stressful. EmberKids made the process structured, practical, and encouraging for our child.',
    name: 'Vijay',
    role: 'Parent of Balamithran, Age 11',
    imageUrl: '/images/bala.png',
    instagramUrl: 'https://www.instagram.com/reel/DaL7l31znf0/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
  },
  {
    quote: 'The coaches explain ideas patiently and keep us updated after class. We can clearly see the improvement in focus and confidence.',
    name: 'Rajesh Patel',
    role: 'Parent of Maya, Age 10',
    imageUrl: '/images/test2.jpeg',
  }
];

export const CANONICAL_INSTAGRAM_URL =
  process.env.PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/emberkidsofficial';

export function normalizeInstagramHref(href?: string | null): string {
  if (!href) return CANONICAL_INSTAGRAM_URL;

  try {
    const url = new URL(href);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();

    if (hostname === 'instagram.com' && ['/emberkids', '/emberkidsofficial'].includes(pathname)) {
      return CANONICAL_INSTAGRAM_URL;
    }
  } catch {
    return href;
  }

  return href;
}

export function buildDefaultSocialLinks(profile: Pick<SiteProfile, 'email' | 'whatsappHref'>): SocialLink[] {
  return [
    {
      name: 'Email',
      href: `mailto:${profile.email}`,
      type: 'mail',
      external: true,
    },
    {
      name: 'WhatsApp',
      href: profile.whatsappHref,
      type: 'whatsapp',
      external: true,
    },
    {
      name: 'Instagram',
      href: CANONICAL_INSTAGRAM_URL,
      type: 'instagram',
      external: true,
    },
  ];
}

const defaultSiteProfile: SiteProfile = {
  name: 'Chess Academy',
  fullName: 'Chess Academy International',
  tagline: 'Building champions, one move at a time',
  description: 'Premium online chess coaching for young minds.',
  email: process.env.PUBLIC_CONTACT_EMAIL || 'hello@emberkidschess.com',
  phone: process.env.PUBLIC_CONTACT_PHONE || '+91 88240 44647',
  phoneHref: process.env.PUBLIC_CONTACT_PHONE_HREF || 'tel:+918824044647',
  whatsappHref: process.env.PUBLIC_WHATSAPP_URL || 'https://wa.me/918824044647',
  supportLine: process.env.PUBLIC_CONTACT_PHONE || '+91 88240 44647',
};

export const defaultSiteConfig: SiteConfigResponse = {
  profile: defaultSiteProfile,
  navigation: [
    { name: "Home", href: "/" },
    { name: "Academy", href: "/about" },
    { name: "Curriculum", href: "/courses" },
    { name: "Prodigies", href: "/prodigies" },
    { name: "Contact", href: "/contact" },
  ],
  primaryCta: { label: 'Book a Free Trial', href: '/contact' },
  secondaryCta: { label: 'View Courses', href: '/courses' },
  socialLinks: buildDefaultSocialLinks(defaultSiteProfile),
};
