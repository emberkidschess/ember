import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { buildWebsiteKnowledge, KnowledgeDocumentInput } from '../data/academyKnowledge';
import {
  defaultCourses,
  defaultRoadmap,
  defaultSiteConfig,
  defaultTestimonials,
} from '../data/defaults';
import { Course } from '../models/Course';
import { Roadmap } from '../models/Roadmap';
import { SiteConfig } from '../models/SiteConfig';
import { Testimonial } from '../models/Testimonial';
import Batch, { BatchStatus } from '../models/Batch';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import AcademyEvent, {
  AcademyEventStatus,
} from '../models/AcademyEvent';
import KnowledgeChunk from '../models/KnowledgeChunk';
import logger from '../utils/logger';

const EMBEDDING_DIMENSIONS = 768;
const MAX_CHUNK_CHARACTERS = 1_400;
const CHUNK_OVERLAP_CHARACTERS = 160;
const EMBEDDING_BATCH_SIZE = 16;
const DEFAULT_TOP_K = 4;
const MAX_CONTEXT_CHARACTERS = 5_200;

export interface PreparedKnowledgeChunk extends KnowledgeDocumentInput {
  sourceId: string;
  content: string;
  contentHash: string;
}

export interface RetrievedKnowledge {
  sourceId: string;
  category: string;
  title: string;
  url: string;
  content: string;
  score: number;
}

interface CachedKnowledgeChunk {
  sourceId: string;
  category: string;
  title: string;
  url: string;
  content: string;
  embedding: number[];
}

interface RefreshSummary {
  documents: number;
  chunks: number;
  embedded: number;
  removed: number;
}

let client: GoogleGenAI | null = null;
let memoryIndex: CachedKnowledgeChunk[] | null = null;
let lastRefreshAt = 0;
let refreshPromise: Promise<RefreshSummary> | null = null;

function embeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
}

function refreshIntervalMs(): number {
  const minutes = Number.parseInt(process.env.RAG_REFRESH_MINUTES || '15', 10);
  return Math.max(1, Number.isFinite(minutes) ? minutes : 15) * 60_000;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function splitKnowledgeText(
  input: string,
  maxCharacters = MAX_CHUNK_CHARACTERS,
  overlapCharacters = CHUNK_OVERLAP_CHARACTERS
): string[] {
  const text = normalizeText(input);
  if (!text) return [];
  if (text.length <= maxCharacters) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + maxCharacters);
    if (end < text.length) {
      const searchFrom = Math.max(start + Math.floor(maxCharacters * 0.65), end - 320);
      const window = text.slice(searchFrom, end);
      const boundary = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('? '),
        window.lastIndexOf('! '),
        window.lastIndexOf('; ')
      );
      if (boundary >= 0) end = searchFrom + boundary + 1;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;

    const nextStart = Math.max(0, end - overlapCharacters);
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

function chunkHash(chunk: Omit<PreparedKnowledgeChunk, 'contentHash'>): string {
  return crypto
    .createHash('sha256')
    .update(
      [embeddingModel(), chunk.category, chunk.title, chunk.url, chunk.content].join('\n')
    )
    .digest('hex');
}

export function prepareKnowledgeChunks(
  documents: KnowledgeDocumentInput[]
): PreparedKnowledgeChunk[] {
  return documents.flatMap((document) =>
    splitKnowledgeText(document.text).map((content, index) => {
      const chunk = {
        ...document,
        sourceId: `${document.sourceId}:chunk:${index + 1}`,
        content,
      };
      return { ...chunk, contentHash: chunkHash(chunk) };
    })
  );
}

export function normalizeEmbedding(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) throw new Error('Gemini returned an empty embedding');
  return values.map((value) => value / magnitude);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return -1;
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
  }
  return dot;
}

function dateLabel(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function weekdaySchedule(days?: number[], startTime?: string, timezone?: string): string | null {
  if (!days?.length || !startTime) return null;
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const names = days.map((day) => weekdayNames[day]).filter(Boolean).join(', ');
  return `${names} at ${startTime}${timezone ? ` (${timezone})` : ''}`;
}

async function collectKnowledgeDocuments(): Promise<KnowledgeDocumentInput[]> {
  const [siteConfig, courses, roadmap, coaches, batches, events, testimonials] =
    await Promise.all([
      SiteConfig.findOne().lean(),
      Course.find().sort({ order: 1 }).lean(),
      Roadmap.find().sort({ order: 1 }).lean(),
      Staff.find({ role: StaffRole.COACH, status: StaffStatus.ACTIVE })
        .select('name expertise updatedAt')
        .lean(),
      Batch.find({ status: { $in: [BatchStatus.UPCOMING, BatchStatus.ONGOING] } })
        .select(
          'name courseLevel coach status schedule timezone startDate frequencyDays classStartTime classDurationMinutes totalSessions updatedAt'
        )
        .populate('coach', 'name')
        .sort({ startDate: 1, name: 1 })
        .lean(),
      AcademyEvent.find({ status: AcademyEventStatus.SCHEDULED })
        .select('type name country timezone date startTime durationMinutes coach level updatedAt')
        .populate('coach', 'name')
        .sort({ date: 1, startTime: 1 })
        .lean(),
      Testimonial.find({ isActive: true })
        .select('quote name role location updatedAt')
        .sort({ order: 1 })
        .lean(),
    ]);

  const profile = siteConfig?.profile || defaultSiteConfig.profile;
  const courseRecords = courses.length ? courses : defaultCourses;
  const roadmapRecords = roadmap.length ? roadmap : defaultRoadmap;
  const testimonialRecords = testimonials.length ? testimonials : defaultTestimonials;

  const dynamicDocuments: KnowledgeDocumentInput[] = [];

  for (const course of courseRecords) {
    const rawId = '_id' in course && course._id ? String(course._id) : course.level;
    dynamicDocuments.push({
      sourceId: `content:course:${rawId}`,
      category: 'courses',
      title: `${course.level}: ${course.title} — ${course.subtitle}`,
      url: '/courses',
      text: `${course.title} is ${course.level} of the EmberKids curriculum and is called ${course.subtitle}. ${course.desc} Topics include ${course.topics.join(', ')}.${course.isPremium ? ' This is the premium expert-level course.' : ''}`,
      updatedAt: 'updatedAt' in course ? (course.updatedAt as Date) : undefined,
    });
  }

  for (const phase of roadmapRecords) {
    const rawId = '_id' in phase && phase._id ? String(phase._id) : phase.phase;
    dynamicDocuments.push({
      sourceId: `content:roadmap:${rawId}`,
      category: 'courses',
      title: `Learning roadmap: ${phase.title}`,
      url: '/courses',
      text: `${phase.phase}: ${phase.title}, intended rating stage ${phase.rating}. Expected outcome: ${phase.outcome}`,
      updatedAt: 'updatedAt' in phase ? (phase.updatedAt as Date) : undefined,
    });
  }

  for (const coach of coaches) {
    dynamicDocuments.push({
      sourceId: `database:coach:${coach._id}`,
      category: 'coaches',
      title: `Coach ${coach.name}`,
      url: '/#coaches',
      text: `${coach.name} is an active EmberKids coach.${coach.expertise?.length ? ` Areas of expertise: ${coach.expertise.join(', ')}.` : ''}`,
      updatedAt: coach.updatedAt,
    });
  }

  for (const batch of batches as any[]) {
    const coachName =
      batch.coach && typeof batch.coach === 'object' ? batch.coach.name : null;
    const schedule =
      batch.schedule ||
      weekdaySchedule(batch.frequencyDays, batch.classStartTime, batch.timezone) ||
      'Contact admissions for the exact current timing';
    const startDate = dateLabel(batch.startDate);
    dynamicDocuments.push({
      sourceId: `database:batch:${batch._id}`,
      category: 'batches',
      title: `${batch.name} batch`,
      url: '/contact',
      text: `${batch.name} is a ${batch.status} ${batch.courseLevel} batch. Public schedule: ${schedule}.${startDate ? ` Start date: ${startDate}.` : ''}${coachName ? ` Coach: ${coachName}.` : ''}${batch.classDurationMinutes ? ` Class duration: ${batch.classDurationMinutes} minutes.` : ''} The batch plan contains ${batch.totalSessions} sessions. Availability must be confirmed with admissions.`,
      updatedAt: batch.updatedAt,
    });
  }

  for (const event of events as any[]) {
    const coachName =
      event.coach && typeof event.coach === 'object' ? event.coach.name : null;
    dynamicDocuments.push({
      sourceId: `database:event:${event._id}`,
      category: 'events',
      title: event.name,
      url: '/contact',
      text: `${event.name} is an upcoming EmberKids ${event.type}. It is scheduled for ${dateLabel(event.date) || 'a date to be confirmed'} at ${event.startTime} in ${event.timezone} for participants in ${event.country}.${event.level ? ` Level: ${event.level}.` : ''}${coachName ? ` Coach: ${coachName}.` : ''} Duration: ${event.durationMinutes} minutes. Eligibility and joining information are provided privately to enrolled families.`,
      updatedAt: event.updatedAt,
    });
  }

  for (const testimonial of testimonialRecords) {
    const rawId = '_id' in testimonial && testimonial._id ? String(testimonial._id) : testimonial.name;
    dynamicDocuments.push({
      sourceId: `content:testimonial:${rawId}`,
      category: 'testimonials',
      title: `Parent testimonial from ${testimonial.name}`,
      url: '/#testimonials',
      text: `${testimonial.name}, ${testimonial.role}${testimonial.location ? ` from ${testimonial.location}` : ''}, says: ${testimonial.quote}`,
      updatedAt: 'updatedAt' in testimonial ? (testimonial.updatedAt as Date) : undefined,
    });
  }

  return [...buildWebsiteKnowledge(profile), ...dynamicDocuments];
}

async function embedTexts(texts: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  const response = await getGeminiClient().models.embedContent({
    model: embeddingModel(),
    contents: texts,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embeddings = response.embeddings || [];
  if (embeddings.length !== texts.length) {
    throw new Error(`Expected ${texts.length} embeddings but received ${embeddings.length}`);
  }

  return embeddings.map((embedding) => normalizeEmbedding(embedding.values || []));
}

async function loadMemoryIndex(): Promise<CachedKnowledgeChunk[]> {
  const records = await KnowledgeChunk.find()
    .select('+embedding sourceId category title url content')
    .lean();
  memoryIndex = records.map((record) => ({
    sourceId: record.sourceId,
    category: record.category,
    title: record.title,
    url: record.url,
    content: record.content,
    embedding: record.embedding,
  }));
  return memoryIndex;
}

async function performRefresh(force = false): Promise<RefreshSummary> {
  getGeminiClient();
  const documents = await collectKnowledgeDocuments();
  const chunks = prepareKnowledgeChunks(documents);
  const existing = await KnowledgeChunk.find({
    sourceId: { $in: chunks.map((chunk) => chunk.sourceId) },
  })
    .select('sourceId contentHash embeddingModel embeddingDimensions')
    .lean();
  const existingBySource = new Map(existing.map((record) => [record.sourceId, record]));
  const changed = chunks.filter((chunk) => {
    const record = existingBySource.get(chunk.sourceId);
    return (
      force ||
      !record ||
      record.contentHash !== chunk.contentHash ||
      record.embeddingModel !== embeddingModel() ||
      record.embeddingDimensions !== EMBEDDING_DIMENSIONS
    );
  });

  for (let offset = 0; offset < changed.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = changed.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const embeddings = await embedTexts(
      batch.map((chunk) => `${chunk.title}\n${chunk.content}`),
      'RETRIEVAL_DOCUMENT'
    );
    const indexedAt = new Date();
    await KnowledgeChunk.bulkWrite(
      batch.map((chunk, index) => ({
        updateOne: {
          filter: { sourceId: chunk.sourceId },
          update: {
            $set: {
              sourceId: chunk.sourceId,
              category: chunk.category,
              title: chunk.title,
              url: chunk.url,
              content: chunk.content,
              contentHash: chunk.contentHash,
              embedding: embeddings[index],
              embeddingModel: embeddingModel(),
              embeddingDimensions: EMBEDDING_DIMENSIONS,
              sourceUpdatedAt: chunk.updatedAt,
              indexedAt,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  const activeSourceIds = chunks.map((chunk) => chunk.sourceId);
  const removal = await KnowledgeChunk.deleteMany({ sourceId: { $nin: activeSourceIds } });
  await loadMemoryIndex();
  lastRefreshAt = Date.now();

  return {
    documents: documents.length,
    chunks: chunks.length,
    embedded: changed.length,
    removed: removal.deletedCount,
  };
}

export async function refreshKnowledgeBase(force = false): Promise<RefreshSummary> {
  if (!force && refreshPromise) return refreshPromise;
  refreshPromise = performRefresh(force).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function ensureKnowledgeBase(): Promise<CachedKnowledgeChunk[]> {
  const isFresh =
    memoryIndex &&
    memoryIndex.length > 0 &&
    Date.now() - lastRefreshAt < refreshIntervalMs();
  if (!isFresh) await refreshKnowledgeBase(false);
  return memoryIndex || loadMemoryIndex();
}

function lexicalRelevance(query: string, chunk: CachedKnowledgeChunk): number {
  const queryTerms = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2)
  );
  if (!queryTerms.size) return 0;
  const haystack = `${chunk.title} ${chunk.content}`.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) if (haystack.includes(term)) matches += 1;
  return matches / queryTerms.size;
}

export async function retrieveKnowledge(
  query: string,
  requestedTopK?: number
): Promise<RetrievedKnowledge[]> {
  const index = await ensureKnowledgeBase();
  const [queryEmbedding] = await embedTexts([normalizeText(query)], 'RETRIEVAL_QUERY');
  const configuredTopK = Number.parseInt(process.env.RAG_TOP_K || String(DEFAULT_TOP_K), 10);
  const topK = Math.min(6, Math.max(1, requestedTopK || configuredTopK || DEFAULT_TOP_K));

  let contextCharacters = 0;
  return index
    .map((chunk) => {
      const semantic = cosineSimilarity(queryEmbedding, chunk.embedding);
      const lexical = lexicalRelevance(query, chunk);
      return { ...chunk, score: semantic * 0.94 + Math.min(0.06, lexical * 0.06) };
    })
    .sort((left, right) => right.score - left.score)
    .filter((chunk) => {
      if (contextCharacters >= MAX_CONTEXT_CHARACTERS) return false;
      contextCharacters += chunk.content.length;
      return true;
    })
    .slice(0, topK)
    .map(({ embedding: _embedding, ...chunk }) => chunk);
}

const directAcademyTerms = [
  'academy',
  'admission',
  'batch',
  'class',
  'coach',
  'contact',
  'course',
  'curriculum',
  'demo',
  'emberkids',
  'enrol',
  'enroll',
  'fee',
  'instructor',
  'lesson',
  'payment',
  'policy',
  'privacy',
  'refund',
  'schedule',
  'session',
  'student portal',
  'term',
  'timing',
  'trial',
  'tournament',
];

export function isAcademyRelated(
  query: string,
  retrieved: RetrievedKnowledge[]
): boolean {
  const normalized = query.toLowerCase();
  if (/^(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/.test(normalized)) {
    return true;
  }
  if (directAcademyTerms.some((term) => normalized.includes(term))) return true;
  if (/\b(chess|child|kid)\b/.test(normalized) && /\b(learn|training|teach|focus|begin|age|online)\b/.test(normalized)) {
    return true;
  }
  return (retrieved[0]?.score || 0) >= 0.56;
}

export async function getPublicContactDetails(): Promise<{
  email: string;
  phone: string;
  whatsappHref: string;
}> {
  const config = await SiteConfig.findOne().select('profile').lean();
  const profile = config?.profile || defaultSiteConfig.profile;
  return {
    email: profile.email,
    phone: profile.phone,
    whatsappHref: profile.whatsappHref,
  };
}

export async function buildKnowledgeSnapshot(): Promise<{
  documents: KnowledgeDocumentInput[];
  chunks: PreparedKnowledgeChunk[];
}> {
  const documents = await collectKnowledgeDocuments();
  return { documents, chunks: prepareKnowledgeChunks(documents) };
}

export function initializeKnowledgeBase(): void {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    logger.warn('GEMINI_API_KEY is not set; academy chatbot indexing is disabled');
    return;
  }
  void refreshKnowledgeBase(false)
    .then((summary) => {
      logger.info(
        `Academy knowledge index ready: ${summary.chunks} chunks (${summary.embedded} refreshed)`
      );
    })
    .catch((error) => logger.error('Failed to initialize academy knowledge index', error));
}
