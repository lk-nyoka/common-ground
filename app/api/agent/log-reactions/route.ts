import { NextRequest, NextResponse } from 'next/server';
import { CaregiverProfile, ReactionType } from '../../../../lib/types';
import { recordVisitReactions } from '../../../../lib/care-logic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, reactions, note } = body as {
      profile: CaregiverProfile;
      reactions: Record<string, ReactionType>;
      note?: string;
    };

    if (!profile || !reactions) {
      return NextResponse.json({ error: 'Profile and reactions are required' }, { status: 400 });
    }

    const updatedProfile = recordVisitReactions(profile, reactions, note);
    return NextResponse.json({ profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Reaction logging failed' }, { status: 500 });
  }
}
