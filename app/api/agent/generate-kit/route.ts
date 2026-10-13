import { NextRequest, NextResponse } from 'next/server';
import { CaregiverProfile } from '../../../../lib/types';
import { planVisit } from '../../../../lib/agent';
import { guarded } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Plan a visit kit for a profile. The agent calls Qloo (and the LLM, if configured). */
async function handle(request: NextRequest) {
  try {
    const body = await request.json();
    const profile: CaregiverProfile = body?.profile ?? body;
    if (!profile || !profile.lovedOneName || !Array.isArray(profile.tasteMapNodes)) {
      return NextResponse.json({ error: 'A profile is required' }, { status: 400 });
    }
    const { profile: updated } = await planVisit(profile);
    return NextResponse.json({ profile: updated });
  } catch (error: any) {
    console.error('generate-kit failed', error);
    return NextResponse.json({ error: 'Kit generation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return guarded(request, 'gentle_kit', () => handle(request));
}
