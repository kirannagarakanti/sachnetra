export function validateApiKey(
  req: Request,
  options?: { forceKey?: boolean }
): { valid: boolean; required: boolean; error?: string };
