import type { SiteProfile } from '../types';

export type KnowledgeCategory =
  | 'academy'
  | 'admissions'
  | 'batches'
  | 'contact'
  | 'courses'
  | 'coaches'
  | 'events'
  | 'faq'
  | 'fees'
  | 'policies'
  | 'results'
  | 'testimonials';

export interface KnowledgeDocumentInput {
  sourceId: string;
  category: KnowledgeCategory;
  title: string;
  url: string;
  text: string;
  updatedAt?: Date;
}

const coachDocuments: KnowledgeDocumentInput[] = [
  {
    sourceId: 'website:coach:manish-kumar',
    category: 'coaches',
    title: 'Coach Manish Kumar',
    url: '/#coaches',
    text:
      'Manish Kumar is an international-rated chess player with more than five years of experience. He specialises in middle-game strategy and positional understanding. His public profile highlights state-level tournament performances, experience training more than 500 students across skill levels, and a focus on strong fundamentals for beginners and advanced players.',
  },
  {
    sourceId: 'website:coach:priya-nair',
    category: 'coaches',
    title: 'Coach Priya Nair',
    url: '/#coaches',
    text:
      'Priya Nair is an international-rated chess player with more than eight years of experience. She specialises in endgames and strategy, using analytical frameworks for intermediate and advanced students. Her public profile lists the 2020 National Women’s Chess Championship, an international title earned at age 16, and authorship of Endgame Blueprints for Juniors.',
  },
  {
    sourceId: 'website:coach:rahul-sharma',
    category: 'coaches',
    title: 'Coach Rahul Sharma',
    url: '/#coaches',
    text:
      'Rahul Sharma is an international-rated chess player with more than five years of experience and a speciality in tactical training. His public profile lists U14 State Champion, second place at U15 state level, third place at U17 state level, third place at U17 school level, and sixth in category at the Skill Craft below-1800 event.',
  },
];

export function buildWebsiteKnowledge(profile: SiteProfile): KnowledgeDocumentInput[] {
  const contactText = [
    `General enquiries and admissions: ${profile.email}.`,
    `Phone: ${profile.phone}.`,
    `Support line: ${profile.supportLine}.`,
    `WhatsApp: ${profile.whatsappHref}.`,
    'The academy team reviews website enquiries within 24 hours, calls to understand the child’s needs, and then schedules a free 30-minute assessment session.',
  ].join(' ');

  return [
    {
      sourceId: 'website:academy:overview',
      category: 'academy',
      title: 'About EmberKids Chess Academy',
      url: '/about',
      text:
        'EmberKids Chess Academy provides structured online chess coaching for children. Its curriculum is designed to develop focus, confidence, critical thinking, concentration, problem solving, decision making, and tournament readiness. The academy teaches children to think ahead through progressive instruction rather than rote memorisation. Public website figures state that more than 5,000 students across more than 20 countries have trained with the academy.',
    },
    {
      sourceId: 'website:academy:method',
      category: 'academy',
      title: 'How EmberKids teaches',
      url: '/about',
      text:
        'The learning journey has four stages: concept introduction using visual examples, guided practice with real-time coach feedback, peer learning through small-group games and discussion, and review through session recaps and homework. Classes are live and interactive. The website describes small groups of no more than six students, HD video, real-time chat, flexible scheduling, personalised attention, progress tracking, online resources and puzzles, internal tournaments, course-completion certification, and parent-teacher meetings.',
    },
    {
      sourceId: 'website:admissions:process',
      category: 'admissions',
      title: 'Admission process',
      url: '/contact',
      text:
        'Admission starts with a free trial and skill assessment. A coach evaluates the child’s current chess knowledge and learning needs, then discusses the recommended course level and available schedule with the parent. If the family chooses to continue, the academy sends a secure payment link. After payment and enrolment are confirmed, the academy creates the student account and sends login details by email and WhatsApp. Visitors do not create student accounts directly.',
    },
    {
      sourceId: 'website:admissions:trial',
      category: 'admissions',
      title: 'Free demo and assessment class',
      url: '/contact',
      text:
        'The academy offers a free 30-minute trial and assessment session. During the session, a certified coach interacts with the child, evaluates current understanding, logical patterns and chess knowledge, and recommends a suitable course level. A trial can be requested from the website contact or trial form. The team follows up to confirm a suitable date and time.',
    },
    {
      sourceId: 'website:batches:format',
      category: 'batches',
      title: 'Class format and batch timing',
      url: '/contact',
      text:
        'EmberKids offers three batch formats: 1:1 personalised coaching, Premium Group batches with 2–3 students, and Standard batches with 5–6 students. Batch timing options include weekday, evening and weekend possibilities, subject to current availability and the child’s assessed level. For the latest schedule in the family’s timezone, visitors should contact the academy or book the free assessment.',
    },
    {
      sourceId: 'website:batches:options',
      category: 'batches',
      title: 'Batch types and group sizes',
      url: '/contact',
      text:
        'The academy provides three learning formats: 1:1 one-to-one coaching, Premium Group batches of 2–3 students, and Standard batches of 5–6 students. Current availability and timing are confirmed by the academy consultant after understanding the child’s level and requirements.',
    },
    {
      sourceId: 'website:fees:availability',
      category: 'fees',
      title: 'Fees and payment information',
      url: '/terms',
      text:
        `The public website does not publish a fixed fee table, because the appropriate level, package and available schedule are confirmed after assessment. For current fees and package options, contact the admissions team using ${profile.email}, ${profile.phone}, or WhatsApp at ${profile.whatsappHref}. Once a family is ready to enrol, the academy sends a secure payment link. Payment is due at enrolment. The Terms of Service say fees are non-refundable unless otherwise stated, fees may change, and late payment may result in service suspension. The chatbot must never invent or estimate a price.`,
    },
    {
      sourceId: 'website:faq:beginners-age',
      category: 'faq',
      title: 'Beginner suitability and starting age',
      url: '/courses',
      text:
        'The program is suitable for absolute beginners. Level 01 begins with piece movement, chess rules and other fundamentals. The academy recommends starting from age five and above, when children can usually understand basic logic, spatial orientation and turn-taking. The free assessment helps confirm readiness and the right course level for each child.',
    },
    {
      sourceId: 'website:faq:missed-class',
      category: 'faq',
      title: 'Missed classes and recordings',
      url: '/courses',
      text:
        'If a child misses a scheduled class, the website says live sessions are recorded and students receive lifetime access to dashboard recordings. The academy also provides a 15-minute doubt-clearing window before the next session so the student can catch up.',
    },
    {
      sourceId: 'website:contact:details',
      category: 'contact',
      title: 'Contact EmberKids',
      url: '/contact',
      text: contactText,
    },
    {
      sourceId: 'website:privacy:collection-use',
      category: 'policies',
      title: 'Privacy policy — information collection and use',
      url: '/privacy',
      text:
        'EmberKids may collect contact information, student age, grade and chess experience, parent or guardian information, payment information handled by third-party processors, and website usage data. It uses this information to deliver and improve chess education, communicate about classes and schedules, process payments and subscriptions, send consented educational or promotional material, analyse usage, and meet legal obligations.',
    },
    {
      sourceId: 'website:privacy:children-rights',
      category: 'policies',
      title: 'Privacy policy — children, security and rights',
      url: '/privacy',
      text:
        `The services are designed for children under 18. The policy says children’s personal information is collected only with verifiable parental consent. Parents and guardians may review information, request deletion, or refuse further collection or use. Users may access or correct their information, request deletion, opt out of marketing, and withdraw consent. Questions about privacy can be sent to ${profile.email}. The academy uses technical and organisational safeguards but does not claim that internet transmission is completely secure.`,
    },
    {
      sourceId: 'website:terms:service-accounts',
      category: 'policies',
      title: 'Terms — services and user accounts',
      url: '/terms',
      text:
        'EmberKids provides online chess education including live classes, curriculum materials and coaching. Services may be modified, suspended or discontinued. Account information must be accurate and current, credentials must be kept secure, unauthorised use must be reported promptly, and the account holder is responsible for activity under the account.',
    },
    {
      sourceId: 'website:terms:conduct-content',
      category: 'policies',
      title: 'Terms — attendance, conduct and learning content',
      url: '/terms',
      text:
        'Students are expected to attend on time, respect coaches and other students, follow classroom rules, and behave appropriately. Serious policy violations may lead to dismissal without a refund. Lessons, curriculum, videos and materials are protected intellectual property and may not be reproduced, distributed or adapted without written consent.',
    },
    {
      sourceId: 'website:terms:termination-law',
      category: 'policies',
      title: 'Terms — liability, termination and governing law',
      url: '/terms',
      text:
        'The Terms limit liability for indirect or consequential loss and cap total liability at the amount paid for the service. Accounts may be suspended or terminated for violating the terms. The governing law is the law applicable where the academy operator is established, subject to applicable consumer law. Terms questions can be sent to the academy contact email.',
    },
    {
      sourceId: 'website:results:featured-student',
      category: 'results',
      title: 'Featured student result — Balamithran Vijay',
      url: '/prodigies',
      text:
        'Balamithran Vijay is featured as a London Chess Club Junior Tournament winner. The website reports a score of 6.5 out of 7 and a tournament rating of 1175, crediting dedicated training, consistent practice and strategic guidance.',
    },
    ...coachDocuments,
  ];
}
