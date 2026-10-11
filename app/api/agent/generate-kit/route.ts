import { NextRequest, NextResponse } from 'next/server';
import { CaregiverProfile } from '../../../../lib/types';
import { generateNextVisitKit } from '../../../../lib/care-logic';

export async function POST(request: NextRequest) {
  try {
    const profile: CaregiverProfile = await request.json();
    if (!profile || !profile.lovedOneName) {
      return NextResponse.json({ error: 'Valid profile payload required' }, { status: 400 });
    }

    const kit = generateNextVisitKit(profile);
    return NextResponse.json({ kit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Kit generation failed' }, { status: 500 });
  }
}
