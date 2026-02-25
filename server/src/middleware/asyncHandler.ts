import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wraps an async route handler so that any thrown error
 * is forwarded to Express's error middleware instead of crashing the process.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}
