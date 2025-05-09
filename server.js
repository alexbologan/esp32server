const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configure storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `esp32-${Date.now()}.jpg`);
  }
});

const upload = multer({ storage });

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  res.json({ 
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// Serve static files
app.use('/uploads', express.static('uploads'));

// Gallery webpage
app.get('/gallery', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).send('Error reading photos');
    
    const photos = files
      .filter(file => file.endsWith('.jpg'))
      .map(file => `
        <div class="photo">
          <h3>${file}</h3>
          <img src="/uploads/${file}" style="max-width: 400px;">
          <p>Uploaded: ${fs.statSync(path.join('uploads', file)).birthtime.toLocaleString()}</p>
        </div>
      `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32-CAM Gallery</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .photo { margin: 20px; padding: 20px; border: 1px solid #ddd; }
          img { max-height: 300px; }
        </style>
      </head>
      <body>
        <h1>ESP32-CAM Photo Gallery</h1>
        <div id="photos">${photos || '<p>No photos yet. Upload some from your ESP32!</p>'}</div>
      </body>
      </html>
    `);
  });
});

app.listen(PORT, () => {
  console.log(`📸 Server running at http://localhost:${PORT}`);
  console.log(`🖼️ View photos at http://localhost:${PORT}/gallery`);
});