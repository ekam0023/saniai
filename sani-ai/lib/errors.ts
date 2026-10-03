import { ZodError } from 'zod';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof AppError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError) {
    const f = e.issues[0];
    return Response.json({ error: `Invalid request: ${f?.path.join('.') || 'input'} ${f?.message ?? ''}`.trim() }, { status: 400 });
  }
  console.error('[server error]', e instanceof Error ? e.message : 'unknown');
  return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}
