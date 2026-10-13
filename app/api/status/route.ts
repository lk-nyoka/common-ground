import { NextResponse } from 'next/server';
import { qlooKeyIsSet, savedFixtureCount } from '../../../lib/qloo-client';
import { llmIsConfigured, llmModel } from '../../../lib/llm';

export const dynamic = 'force-dynamic';

/** What's connected, so the UI can say so honestly. Never returns keys. */
export async function GET() {
  return NextResponse.json({
    qloo: { keySet: qlooKeyIsSet(), savedResponses: await savedFixtureCount() },
    llm: { configured: llmIsConfigured(), model: llmIsConfigured() ? llmModel() : null }
  });
}
