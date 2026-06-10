/**
 * Linking Service
 * Handles deep linking and universal links for the app
 */

import * as Linking from 'expo-linking';

// Base configuration
const WEB_URL = 'https://dawahnigeria.com'; // Your web URL
const WEB_BASE_PATH = '/dawahcast'; // Base path for all content

export class LinkingService {
  private static readonly ALLOWED_DEEP_LINK_PATHS = ['lecture', 'album', 'playlist', 'lecturer', 'quran-reciter'];
  private static readonly VALID_PATH_SEGMENT = /^[A-Za-z0-9_-]{1,120}$/;

  /**
   * Create a web URL for a lecture (universal link compatible)
   * Format: https://dawahnigeria.com/dawahcast/l/[id]
   */
  static createLectureLink(lectureId: string): string {
    return `${WEB_URL}${WEB_BASE_PATH}/l/${lectureId}`;
  }

  /**
   * Create a web URL for a playlist
   * Format: https://dawahnigeria.com/dawahcast/p/[id]
   */
  static createPlaylistLink(playlistId: string): string {
    return `${WEB_URL}${WEB_BASE_PATH}/p/${playlistId}`;
  }

  /**
   * Create a web URL for an album
   * Format: https://dawahnigeria.com/dawahcast/a/[id]
   */
  static createAlbumLink(albumId: string): string {
    return `${WEB_URL}${WEB_BASE_PATH}/a/${albumId}`;
  }

  /**
   * Create a web URL for a Quran reciter (uses album format)
   * Format: https://dawahnigeria.com/dawahcast/a/[id]
   */
  static createQuranReciterLink(reciterId: string): string {
    return `${WEB_URL}${WEB_BASE_PATH}/a/${reciterId}`;
  }

  /**
   * Create a web URL for a lecturer (resource person)
   * Format: https://dawahnigeria.com/dawahcast/rp/[id]
   */
  static createLecturerLink(lecturerId: string): string {
    return `${WEB_URL}${WEB_BASE_PATH}/rp/${lecturerId}`;
  }

  /**
   * Create a deep link (app scheme) URL for a lecture
   * Format: dawahnigeria://lecture/[id]
   */
  static createDeepLectureLink(lectureId: string): string {
    return Linking.createURL(`lecture/${lectureId}`);
  }

  /**
   * Create a deep link (app scheme) URL for a playlist
   */
  static createDeepPlaylistLink(playlistId: string): string {
    return Linking.createURL(`playlist/${playlistId}`);
  }

  /**
   * Create a deep link (app scheme) URL for an album
   */
  static createDeepAlbumLink(albumId: string): string {
    return Linking.createURL(`album/${albumId}`);
  }

  /**
   * Get the initial URL that opened the app
   */
  static async getInitialURL(): Promise<string | null> {
    return await Linking.getInitialURL();
  }

  /**
   * Parse a deep link URL and extract route information
   * Handles both web URLs (https://dawahnigeria.com/dawahcast/l/123)
   * and app scheme URLs (dawahnigeria://lecture/123)
   */
  static parseURL(url: string): { path: string; queryParams: Record<string, string> } | null {
    try {
      // Validate URL format
      if (!url || typeof url !== 'string') {
        console.warn('Invalid URL provided to parseURL');
        return null;
      }

      // Sanitize URL - remove whitespace, limit length
      const sanitizedUrl = url.trim();

      // Prevent excessively long URLs (potential attack)
      if (sanitizedUrl.length > 2000) {
        console.warn('URL too long, potential security issue');
        return null;
      }

      // Check if it's a valid web URL from our domain
      // IMPORTANT: Check startsWith FIRST to prevent URL spoofing attacks
      // (e.g., https://evil.com?redirect=dawahnigeria.com would pass includes check)
      if (sanitizedUrl.startsWith('https://dawahnigeria.com')) {
        return this.parseWebURL(sanitizedUrl);
      }

      // Reject any other URLs containing dawahnigeria.com (potential spoofing)
      if (sanitizedUrl.includes('dawahnigeria.com')) {
        console.warn('Suspicious URL containing dawahnigeria.com but not from the domain');
        return null;
      }

      // Validate app scheme
      if (sanitizedUrl.startsWith('dawahnigeria://')) {
        const parsed = Linking.parse(sanitizedUrl);

        // Validate allowed paths
        const pathBase = parsed.path?.split('/')[0];

        if (!pathBase || !this.ALLOWED_DEEP_LINK_PATHS.includes(pathBase)) {
          console.warn('Invalid app deep link path:', pathBase);
          return null;
        }

        const validPath = this.normalizeAndValidateAppPath(parsed.path || '');
        if (!validPath) {
          console.warn('Invalid deep link route format:', parsed.path);
          return null;
        }

        return {
          path: validPath,
          queryParams: (parsed.queryParams as Record<string, string>) || {},
        };
      }

      console.warn('Unrecognized URL format:', sanitizedUrl);
      return null;
    } catch (error) {
      console.error('Failed to parse URL:', url, error);
      return null;
    }
  }

  /**
   * Parse web URLs and convert to app routes
   * Maps: /dawahcast/l/123 → lecture/123
   */
  private static parseWebURL(url: string): { path: string; queryParams: Record<string, string> } | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove /dawahcast prefix
      const path = pathname.replace(`${WEB_BASE_PATH}/`, '');

      // Map web prefixes to app routes
      const mappings: Record<string, string> = {
        'l/': 'lecture/',      // /dawahcast/l/123 → lecture/123
        'a/': 'album/',        // /dawahcast/a/123 → album/123 (includes Quran reciters)
        'p/': 'playlist/',     // /dawahcast/p/123 → playlist/123
        'rp/': 'lecturer/',    // /dawahcast/rp/123 → lecturer/123
      };

      let appPath = path;
      for (const [webPrefix, appPrefix] of Object.entries(mappings)) {
        if (path.startsWith(webPrefix)) {
          appPath = path.replace(webPrefix, appPrefix);
          break;
        }
      }

      const validPath = this.normalizeAndValidateAppPath(appPath);
      if (!validPath) {
        console.warn('Invalid web deep link path:', appPath);
        return null;
      }

      // Parse query parameters
      const queryParams: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      return {
        path: validPath,
        queryParams,
      };
    } catch (error) {
      console.error('Failed to parse web URL:', url, error);
      return null;
    }
  }

  private static normalizeAndValidateAppPath(path: string): string | null {
    const normalizedPath = path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalizedPath) return null;

    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length !== 2) {
      return null;
    }

    const [base, id] = segments;
    if (!this.ALLOWED_DEEP_LINK_PATHS.includes(base)) {
      return null;
    }

    if (!this.VALID_PATH_SEGMENT.test(id)) {
      return null;
    }

    return `${base}/${id}`;
  }

  /**
   * Open a URL (external link)
   */
  static async openURL(url: string): Promise<boolean> {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  }

  /**
   * Open the website in browser
   */
  static async openWebsite(): Promise<void> {
    await this.openURL(WEB_URL);
  }

  /**
   * Open a lecture on the website (fallback for users without app)
   */
  static async openLectureOnWeb(lectureId: string): Promise<void> {
    const url = this.createLectureLink(lectureId);
    await this.openURL(url);
  }

  /**
   * Open an album on the website (fallback for users without app)
   */
  static async openAlbumOnWeb(albumId: string): Promise<void> {
    const url = this.createAlbumLink(albumId);
    await this.openURL(url);
  }
}

export const linkingService = LinkingService;
