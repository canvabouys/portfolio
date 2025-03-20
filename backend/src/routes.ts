import express, { Express, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error("Stripe secret key is missing");
}
const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Registers all API routes and middleware.
 */
export const registerRoutes = (app: Express) => {
  const router = express.Router();

  // Set up authentication
  setupAuth(app);

  // Health check route
  router.get("/health", (_req: Request, res: Response) => {
    res.json({ message: "API is up and running!" });
  });

  // Root route
  router.get("/", (_req: Request, res: Response) => {
    res.send("Backend is working fine!\n\n");
  });

  // Storage-related routes
  router.get("/storage/users", async (_req: Request, res: Response) => {
    try {
      const users = Array.from(storage.users.values());
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  router.post("/storage/users", async (req: Request, res: Response) => {
    try {
      const newUser = await storage.createUser(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Contact form submission route
  router.post("/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      // Log contact data
      const contactData = { name, email, subject, message };
      console.log("Contact form submission:", contactData);

      res.status(200).json({ message: "Contact form submitted successfully" });
    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ message: "Failed to process contact form" });
    }
  });

  // Payment intent creation route
  router.post("/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;

      // Validate the amount
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount. Amount must be a positive number.",
        });
      }

      // Validate Stripe secret key format
      if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
        console.error("Invalid Stripe secret key format.");
        return res.status(500).json({
          success: false,
          message: "Payment service configuration error.",
          error: "invalid_api_key_format",
        });
      }

      // Create a PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });

      // Return the client secret
      res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (stripeError: any) {
      console.error("Stripe API error:", stripeError);

      // Handle Stripe-specific errors
      if (stripeError.type === "StripeAuthenticationError") {
        return res.status(500).json({
          success: false,
          message: "Payment service authentication failed. Please check API keys.",
          error: "authentication_failed",
        });
      }

      return res.status(500).json({
        success: false,
        message: `Payment service error: ${stripeError.message}`,
        error: stripeError.type || "stripe_error",
      });
    }
  });

  // Booking confirmation route
  router.post("/bookings", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, ...bookingData } = req.body;

      // Validate the paymentIntentId
      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "Payment intent ID is required.",
        });
      }

      // Handle pending payments
      if (paymentIntentId === "pending_payment") {
        console.log("Booking data (payment pending):", bookingData);
        return res.status(200).json({
          success: true,
          message: "Booking request submitted. Payment will be collected later.",
          status: "pending_payment",
        });
      }

      // Verify the payment was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          success: false,
          message: "Payment not completed.",
        });
      }

      // Log booking data
      console.log("Booking data (payment confirmed):", bookingData);

      res.status(200).json({
        success: true,
        message: "Booking confirmed and payment processed successfully.",
        status: "payment_succeeded",
      });
    } catch (error: any) {
      console.error("Error processing booking:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Serve frontend in production
  if (process.env.NODE_ENV === "production") {
    router.use(express.static(path.resolve(__dirname, "../../frontend/dist")));
    router.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
    });
  }

  // Mount the router under the /api prefix
  app.use("/api", router);
};
