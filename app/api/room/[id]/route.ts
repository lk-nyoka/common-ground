import { NextRequest, NextResponse } from 'next/server';
import { act, EMOJI, getRoom, RoomError, type RoomAction, type Who } from '../../../../lib/server/rooms';
import { cleanId, InputError } from '../../../../lib/cg/validate';
import { guarded, readJson } from '../../../../lib/server/http';
import { publicRoom } from '../../../../lib/server/room-view';

export const dynamic = 'force-dynamic';

const ROOM_ID = /^[A-Za-z0-9_-]{8,20}$/;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return guarded(
    request,
    'room_get',
    async () => {
      const room = ROOM_ID.test(params.id) ? getRoom(params.id) : undefined;
      if (!room) return NextResponse.json({ error: 'This room has expired or never existed. Start a new one from your plan.' }, { status: 404 });
      return NextResponse.json(publicRoom(room));
    },
    { bucket: 'roomread', max: 600 }
  );
}

function parseAction(body: any): RoomAction {
  const who: Who = body?.who === 'b' ? 'b' : body?.who === 'a' ? 'a' : (null as never);
  if (!who) throw new InputError('Who is this?');
  switch (body?.type) {
    case 'hello':
    case 'party_pause':
    case 'party_resume':
    case 'party_end':
      return { type: body.type, who };
    case 'swipe': {
      const itemId = cleanId(body.itemId);
      if (!itemId || (body.value !== 'yes' && body.value !== 'no')) throw new InputError('That swipe was not valid.');
      return { type: 'swipe', who, itemId, value: body.value };
    }
    case 'party_start': {
      const itemId = cleanId(body.itemId);
      if (!itemId) throw new InputError('Pick something to start.');
      return { type: 'party_start', who, itemId };
    }
    case 'react':
      if (!EMOJI.includes(body.emoji)) throw new InputError('That reaction isn’t available.');
      return { type: 'react', who, emoji: body.emoji };
    default:
      throw new InputError('Unknown action.');
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return guarded(
    request,
    'room_act',
    async () => {
      if (!ROOM_ID.test(params.id)) throw new InputError('That room link is not valid.');
      const action = parseAction(await readJson(request, 2_000));
      try {
        return NextResponse.json(publicRoom(act(params.id, action)));
      } catch (e) {
        if (e instanceof RoomError) return NextResponse.json({ error: e.message }, { status: e.message.includes('expired') ? 404 : 400 });
        throw e;
      }
    },
    { bucket: 'roomact', max: 600 }
  );
}
