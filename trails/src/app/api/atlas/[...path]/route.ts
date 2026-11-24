import { handleAtlasProxy } from '@atlas/shared/server/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const proxy = async (request: Request, context: RouteContext) => {
  const { path } = await context.params;
  return handleAtlasProxy(request, path, 'trails');
};

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
