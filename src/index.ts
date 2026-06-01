import AgentAPI from "apminsight";
AgentAPI.config()

import express from "express";
import subjectsRoute from "./routes/subjects";
import cors from 'cors';
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app = express();
const PORT = 8000;

if(!process.env.FRONTEND_URL) {
  throw new Error('Origin not found from env.')
}

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  // For allowing cookies
  credentials: true, 
}));

// Use splat as per new rules for express v5 or above
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware);

app.get("/", (req, res) => {
  res.send("Classroom API is running.");
});

app.use("/api/subjects", subjectsRoute)

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});