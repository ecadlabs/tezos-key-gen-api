export type withUser<T> = T & { user: string };
import { Request } from 'express';
import { pools } from '../pools';
export const isAuthorized = (req: Request): req is withUser<Request> => {
  const match = /(bearer|Bearer)\s(.*)/.exec(req.headers['authorization']!);
  if (Array.isArray(match) && match.length === 3 && pools.hasUser(match[2])) {
    (req as any).user = match[2];
    return true;
  } else {
    return false;
  }
}
