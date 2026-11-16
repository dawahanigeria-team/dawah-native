import { linkingService } from '@/services/linking.service';

// Universal links arrive as the website's path (dawahcast/l/123), and the
// router renders that path before any app code runs, so the website-to-screen
// mapping has to happen here rather than in a Linking listener.
const WEBSITE_PATH = /^(?:https:\/\/(?:www\.)?dawahnigeria\.com\/|dawahnigeria:\/\/\/?|\/)?(dawahcast\/[^?#]*)/;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const match = path.match(WEBSITE_PATH);
  if (!match) return path;

  const parsed = linkingService.parseURL(`https://dawahnigeria.com/${match[1]}`);
  return parsed ? `/${parsed.path}` : '/';
}
