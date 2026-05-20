import express from "express";
import subjectsRoute from "./routes/subjects";
import cors from 'cors';

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
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Classroom API is running.");
});

app.use("/api/subjects", subjectsRoute)

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});