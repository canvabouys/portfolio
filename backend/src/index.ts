import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";

const app = express();

// CORS configuration
// app.use(
//   cors({
//     origin: process.env.NODE_ENV === "production"
//       ? process.env.FRONTEND_URL || "https://your-production-frontend-url.com"
//       : "http://localhost:5173",
//     credentials: true,
//   }),
// );

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? "https://5173-canvabouys-portfolio-a5yw5jqokg.app.codeanywhere.com/"
    : "http://localhost:5173", // Replace with your frontend development URL
  credentials: true,
}));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Error-handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`Error: ${message}`);
  res.status(status).json({ message });
});

// Register routes and serve static files
(async () => {
  await registerRoutes(app);
  serveStatic(app);

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();

export default app;
