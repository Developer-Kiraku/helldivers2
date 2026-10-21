import { NextResponse } from 'next/server';
import { tokenHash } from '@/lib/server/passwords';
import { readStore } from '@/lib/server/store';

export async function GET(request) {
  const token = request.cookies.get('hd_signup')?.value;
  const verified = Boolean(
    token &&
    (await readStore((db) =>
      (db.pendingRegistrations || []).some(
        (item) => item.ticketHash === tokenHash(token) && Date.parse(item.expiresAt) > Date.now(),
      ),
    )),
  );
  return NextResponse.json({ verified }, { headers: { 'Cache-Control': 'no-store' } });
}
