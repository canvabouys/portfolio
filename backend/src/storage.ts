import { users, type User, type InsertUser } from "./schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create memory store constructor from session
const MemoryStore = createMemoryStore(session);

/**
 * Interface defining storage operations.
 */
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session store
  sessionStore: session.Store;
}

/**
 * In-memory storage implementation.
 */
export class MemStorage implements IStorage {
  public users: Map<number, User>; // Public map of users
  private currentId: number; // Tracks the next user ID
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.currentId = 1;

    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24 hours
    }) as session.Store;

    // Create a default admin user for testing (password should be hashed in production)
    this.createUser({
      username: "admin",
      password: "password123", // Replace with hashed password in production
    }).catch((err) => console.error("Failed to create default admin user:", err));
  }

  /**
   * Fetches a user by their ID.
   */
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  /**
   * Fetches a user by their username.
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  /**
   * Creates a new user and assigns them an ID.
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

/**
 * Exported instance of the in-memory storage.
 */
export const storage = new MemStorage();
