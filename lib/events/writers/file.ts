/**
 * File-based event writer (development)
 * 
 * Structure:
 * data/events/
 *   ├── 2025-12-10.jsonl  ← Today's events (append-only)
 *   ├── 2025-12-09.jsonl
 *   └── 2025-12-08.jsonl
 * 
 * Format: JSON Lines (one event per line)
 * Each line is a complete JSON event object
 * 
 * WARNING: NOT suitable for production
 * - No transactions
 * - No locking (race conditions possible on high concurrency)
 * - File I/O overhead
 * 
 * Use Redis Streams or D1 for production.
 */

import { appendFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { BaseEvent, EventWriter } from '../types';

export class FileEventWriter implements EventWriter {
  private eventsDir: string;

  constructor(eventsDir: string = 'data/events') {
    this.eventsDir = eventsDir;
    
    // Create events directory if it doesn't exist
    // Use sync API - simple file operations don't need async
    if (!existsSync(this.eventsDir)) {
      mkdirSync(this.eventsDir, { recursive: true });
    }
  }

  async write(event: BaseEvent): Promise<void> {
    const date = new Date(event.timestamp);
    const filename = this.getLogFilename(date);
    const line = JSON.stringify(event) + '\n';

    await appendFile(filename, line, 'utf-8');
  }

  /**
   * Get log filename for a date
   */
  private getLogFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return join(this.eventsDir, `${year}-${month}-${day}.jsonl`);
  }
}
