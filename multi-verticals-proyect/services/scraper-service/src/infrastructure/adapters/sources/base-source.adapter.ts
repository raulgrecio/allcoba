import type { SourcePort, RawExtraction } from '../../../application/ports/source.port.js';
import { RobotsChecker } from '../../crawler/robots-checker.js';
import { CheerioCrawler } from '../../crawler/cheerio-crawler.js';
import { PlaywrightCrawler } from '../../crawler/playwright-crawler.js';

export abstract class BaseSourceAdapter implements SourcePort {
  abstract readonly identifier: string;
  protected robotsChecker = new RobotsChecker();
  protected crawler = new CheerioCrawler();
  protected browser = new PlaywrightCrawler();

  abstract canHandle(url: string): boolean;
  abstract extract(url: string): Promise<RawExtraction>;

  async isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }
}
