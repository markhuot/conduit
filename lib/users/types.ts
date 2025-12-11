/**
 * User management types
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

/**
 * User store interface
 * Implement this for different storage backends (file, D1, KV)
 */
export interface UserStore {
  create(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  exists(email: string): Promise<boolean>;
}

export interface UserConfig {
  store: UserStore;
}
