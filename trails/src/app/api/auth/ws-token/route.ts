import { handleWsToken } from '@atlas/shared/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleWsToken(request, 'trails');
}
