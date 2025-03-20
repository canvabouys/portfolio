import express, { type Express } from "express";
import { existsSync } from "fs"; // Correct import for existsSync
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Logs messages with a timestamp and source identifier.
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Sets up Vite for development mode.
 */
export async function setupVite(app: Express, server: any) {
  if (process.env.NODE_ENV === "production") {
    // Do nothing in production
    return;
  }

  try {
    // Dynamically import Vite only in development
    const { createServer, createLogger } = await import("vite");

    const viteLogger = createLogger();
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    };

    const vite = await createServer({
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg: string, options: any) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);

    // Serve the frontend in development
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "..",
          "frontend",
          "index.html",
        );

        // Reload the index.html file dynamically
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (error) {
    console.error("Failed to initialize Vite:", error);
  }
}

/**
 * Serves static files in production.
 */
export function serveStatic(app: Express) {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "..", "..", "frontend", "dist");

    if (existsSync(distPath)) {
      app.use(express.static(distPath));

      // Fall back to index.html for SPA routing
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.warn(`Frontend build directory not found: ${distPath}`);
    }
  }
}
