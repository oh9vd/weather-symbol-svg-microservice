const express = require('express');
const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('Minimal Test');
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});