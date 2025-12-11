/**
 * File-based user store (development)
 * 
 * Structure:
 * data/users/
 *   ├── by-id/
 *   │   └── user_abc123.json
 *   └── by-email/
 *       └── admin@example.com.json → ../by-id/user_abc123.json
 * 
 * WARNING: NOT suitable for production
 * - No transactions
 * - No locking (race conditions possible)
 * - File I/O overhead
 * 
 * Use D1 for production.
 */

import { writeFile, readFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { User, UserStore } from '../types';

export class FileUserStore implements UserStore {
  private dataDir: string;

  constructor(dataDir: string = 'data/users') {
    this.dataDir = dataDir;
    
    // Create directory structure in constructor
    const dirs = [
      this.dataDir,
      join(this.dataDir, 'by-id'),
      join(this.dataDir, 'by-email'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  async create(user: User): Promise<void> {
    // Write user by ID
    const idPath = join(this.dataDir, 'by-id', `${user.id}.json`);
    await writeFile(idPath, JSON.stringify(user, null, 2), 'utf-8');

    // Write email index (points to same data)
    const emailPath = join(this.dataDir, 'by-email', `${user.email}.json`);
    await writeFile(emailPath, JSON.stringify(user, null, 2), 'utf-8');
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailPath = join(this.dataDir, 'by-email', `${email}.json`);
    
    if (!existsSync(emailPath)) {
      return null;
    }

    const content = await readFile(emailPath, 'utf-8');
    return JSON.parse(content) as User;
  }

  async findById(id: string): Promise<User | null> {
    const idPath = join(this.dataDir, 'by-id', `${id}.json`);
    
    if (!existsSync(idPath)) {
      return null;
    }

    const content = await readFile(idPath, 'utf-8');
    return JSON.parse(content) as User;
  }

  async exists(email: string): Promise<boolean> {
    const emailPath = join(this.dataDir, 'by-email', `${email}.json`);
    return existsSync(emailPath);
  }
}
