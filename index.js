const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Menyajikan file HTML, CSS, JS dari folder "public"
app.use(express.static('public'));

// Endpoint utama
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`✅ Server aktif di http://localhost:${PORT}`);
});
