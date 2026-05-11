import xss from 'xss';
import { NextFunction, Request, Response } from 'express';

const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    return xss(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return sanitizeObject(value);
  }

  return value;
};

const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  return Object.entries(obj).reduce((current, [key, value]) => {
    current[key] = sanitizeValue(value);
    return current;
  }, {} as Record<string, any>);
};

export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && !Buffer.isBuffer(req.body) && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query as Record<string, any>);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params as Record<string, any>);
  }
  next();
};
