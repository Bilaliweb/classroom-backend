import express from "express";

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Classroom API is running.");
});

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
});