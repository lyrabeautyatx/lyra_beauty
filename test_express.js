// Minimal Express test server
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Express is working!');
});

app.listen(PORT, () => {
  console.log(`Minimal Express server running on http://localhost:${PORT}`);
});
