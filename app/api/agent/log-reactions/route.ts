import { NextRequest, NextResponse } from 'next/server';
import { CaregiverProfile, ReactionType } from '../../../../lib/types';
import { nextVisitLine, recordVisitReactions } from '../../../../lib/care-logic';
import { planVisit } from '../../../../lib/agent';
import { guarded } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Record a visit's reactions, then let the agent plan the next kit from what it learned. */
async function handle(request: NextRequest) {
  try {
    const { profile, reactions, note } = (await request.json()) as {
      profile: CaregiverProfile;
      reactions: Record<string, ReactionType>;
      note?: string;
    };
    if (!profile || !reactions || Object.keys(reactions).length === 0) {
      return NextResponse.json({ error: 'A profile and at least one reaction are required' }, { status: 400 });
    }

    const logged = recordVisitReactions(profile, reactions, note);
    const { profile: planned, kit } = await planVisit(logged);

    const log = planned.visitHistory[0];
    const newlyAvoided = Object.entries(reactions)
      .filter(([, r]) => r === 'upset')
      .map(([id]) => log.reactedItems?.[id]?.name)
      .filter((n): n is string => Boolean(n));
    log.agentReflections.nextVisitLine = nextVisitLine(kit, newlyAvoided);

    return NextResponse.json({ profile: planned });
  } catch (error: any) {
    console.error('log-reactions failed', error);
    return NextResponse.json({ error: 'Reaction logging failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return guarded(request, 'gentle_reactions', () => handle(request));
}
