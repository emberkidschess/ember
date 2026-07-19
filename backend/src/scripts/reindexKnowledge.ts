import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import { refreshKnowledgeBase } from '../services/knowledgeBaseService';

dotenv.config();

async function main() {
  try {
    await connectDB();
    const summary = await refreshKnowledgeBase(true);
    console.log(
      `Knowledge index complete: ${summary.documents} documents, ${summary.chunks} chunks, ${summary.embedded} embedded, ${summary.removed} stale chunks removed.`
    );
  } catch (error) {
    console.error('Knowledge indexing failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void main();
