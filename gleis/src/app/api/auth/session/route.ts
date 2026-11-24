import { handleSessionCheck } from '@atlas/shared/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleSessionCheck(request, 'gleis');
}
