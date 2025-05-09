const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.get('/', (req, res) => {
  res.send('<h1>ESP32 Upload Server</h1><p>Go to <a href="/gallery">Gallery</a> to view photos.</p>');
});
//man

// Static folders
app.use('/uploads', express.static('uploads'));

// Setup multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `photo_${timestamp}.jpg`);
  },
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  res.send('Upload successful');
});

// Gallery endpoint
app.get('/gallery', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).send('Failed to read uploads');
    const images = files.map(file => `<img src="/uploads/${file}" width="200">`).join('');
    res.send(`<h1>Gallery</h1>${images}`);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
