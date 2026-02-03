import express from 'express';

const app = express();
const PORT = 8081;

// JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'HELLO WORLD!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
