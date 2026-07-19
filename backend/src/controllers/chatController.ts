import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createAcademyAnswerStream,
  textFromGeminiChunk,
} from '../services/chatService';
import logger from '../utils/logger';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1_200),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2_000),
      })
    )
    .max(12)
    .default([]),
});

function sendEvent(res: Response, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function streamChat(req: Request, res: Response): Promise<void> {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Please send a message of 1,200 characters or fewer.',
    });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': connected\n\n');

  const abortController = new AbortController();
  let connectionClosed = false;
  res.on('close', () => {
    connectionClosed = true;
    abortController.abort();
  });

  try {
    const result = await createAcademyAnswerStream(
      parsed.data.message,
      parsed.data.history,
      abortController.signal
    );
    if (connectionClosed) return;

    if (result.outOfScope) {
      sendEvent(res, { type: 'token', text: result.fallbackText });
      sendEvent(res, { type: 'done', sources: [] });
      res.end();
      return;
    }

    if (!result.stream) throw new Error('Gemini response stream was not created');
    let emittedText = false;
    for await (const chunk of result.stream) {
      if (connectionClosed) return;
      const text = textFromGeminiChunk(chunk);
      if (!text) continue;
      emittedText = true;
      sendEvent(res, { type: 'token', text });
    }

    if (!emittedText) throw new Error('Gemini returned an empty response');
    sendEvent(res, { type: 'done', sources: result.sources });
    res.end();
  } catch (error) {
    if (connectionClosed || abortController.signal.aborted) return;
    logger.error('Academy chatbot request failed', error);
    sendEvent(res, {
      type: 'error',
      message:
        'I couldn’t reply right now. Please try again, or contact the academy team directly.',
    });
    res.end();
  }
}
