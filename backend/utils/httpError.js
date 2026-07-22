export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const assert = (condition, status, message, details) => {
  if (!condition) throw new HttpError(status, message, details);
};
