import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations", // Output directory for migration files
  schema: "../shared/schema.ts", // Path to shared schema
  dialect: "postgresql", // Database dialect
  dbCredentials: {
    url: process.env.DATABASE_URL, // Database connection URL
  },
});
