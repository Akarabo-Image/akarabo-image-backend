export function sendHeadsUpNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string | { invalidToken: true } | null>;
