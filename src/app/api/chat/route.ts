import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/chat-knowledge';
import { verifyAuth, isAuthError } from '@/lib/api-auth';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (isAuthError(authResult)) return authResult.response;

    const { messages, currentPage } = await request.json() as {
      messages: ChatMessage[];
      currentPage?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages required' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'AI assistant not configured' }, { status: 500 });
    }

    // Add current page context to system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (currentPage) {
      systemPrompt += `\n\nΟ χρήστης βρίσκεται τώρα στη σελίδα: ${currentPage}. Λάβε αυτό υπόψη στις απαντήσεις σου.`;
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textContent = response.content.find(c => c.type === 'text');
    const reply = textContent ? textContent.text : 'Δεν μπόρεσα να απαντήσω. Δοκιμάστε ξανά.';

    return Response.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Σφάλμα επικοινωνίας με τον βοηθό' },
      { status: 500 }
    );
  }
}
