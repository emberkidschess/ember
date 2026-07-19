import mongoose, { Document, Model, Schema } from 'mongoose';
import type { KnowledgeCategory } from '../data/academyKnowledge';

export interface IKnowledgeChunk extends Document {
  sourceId: string;
  category: KnowledgeCategory;
  title: string;
  url: string;
  content: string;
  contentHash: string;
  embedding: number[];
  embeddingModel: string;
  embeddingDimensions: number;
  sourceUpdatedAt?: Date;
  indexedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    content: { type: String, required: true },
    contentHash: { type: String, required: true, index: true },
    embedding: { type: [Number], required: true, select: false },
    embeddingModel: { type: String, required: true },
    embeddingDimensions: { type: Number, required: true },
    sourceUpdatedAt: { type: Date },
    indexedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

KnowledgeChunkSchema.index({ category: 1, indexedAt: -1 });

const KnowledgeChunk: Model<IKnowledgeChunk> =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);

export default KnowledgeChunk;
