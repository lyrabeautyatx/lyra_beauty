// Minimal Express test server on port 4000
const express = require('express');
const app = express();
const PORT = 4000;

app.get('/', (req, res) => {
  res.send('Express is working on port 4000!');
});

app.listen(PORT, () => {
  console.log(`Minimal Express server running on http://localhost:${PORT}`);
});
