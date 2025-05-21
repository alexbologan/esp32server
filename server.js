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

// Increase the payload size limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.send('<h1>ESP32 Upload Server</h1><p>Go to <a href="/gallery">Gallery</a> to view photos.</p>');
});

// Static folders
app.use('/uploads', express.static('uploads'));

// Setup multer with more detailed configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `photo_${timestamp}.jpg`);
  }
});

// Configure multer with limits and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Add debugging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Upload endpoint with error handling
app.post('/upload', (req, res) => {
  console.log('Upload request received');
  console.log('Content-Type:', req.headers['content-type']);
  
  upload.single('photo')(req, res, function(err) {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).send(`Upload error: ${err.message}`);
    }
    
    if (!req.file) {
      console.error('No file received');
      return res.status(400).send('No file was uploaded.');
    }
    
    console.log('File saved:', req.file.filename);
    console.log('File size:', req.file.size, 'bytes');
    
    res.status(200).send({
      message: 'Upload successful',
      filename: req.file.filename,
      size: req.file.size
    });
  });
});

// Add DELETE endpoint for removing photos
app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  
  // Check if the file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).send({ 
      success: false, 
      message: 'File not found' 
    });
  }
  
  // Try to delete the file
  try {
    fs.unlinkSync(filepath);
    console.log(`Deleted file: ${filename}`);
    res.status(200).send({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (err) {
    console.error(`Error deleting file ${filename}:`, err);
    res.status(500).send({ 
      success: false, 
      message: 'Failed to delete the file', 
      error: err.message 
    });
  }
});

// Gallery endpoint with sorting by newest first and delete buttons
app.get('/gallery', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) {
      console.error('Failed to read uploads directory:', err);
      return res.status(500).send('Failed to read uploads');
    }
    
    // Filter only image files and sort by creation time (newest first)
    const imageFiles = files.filter(file =>
      file.match(/\.(jpg|jpeg|png|gif)$/i)
    ).sort((a, b) => {
      return fs.statSync(path.join('uploads', b)).mtime.getTime() -
             fs.statSync(path.join('uploads', a)).mtime.getTime();
    });
    
    const images = imageFiles.map(file =>
      `<div style="margin: 10px; display: inline-block; text-align: center;">
        <img src="/uploads/${file}" width="300">
        <div>${file}</div>
        <button onclick="deletePhoto('${file}')" class="delete-btn">Delete</button>
      </div>`
    ).join('');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32-CAM Gallery</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .gallery { display: flex; flex-wrap: wrap; }
          .delete-btn {
            background-color: #ff4d4d;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 5px;
          }
          .delete-btn:hover {
            background-color: #cc0000;
          }
          #status-message {
            margin: 20px 0;
            padding: 10px;
            border-radius: 4px;
          }
          .success {
            background-color: #d4edda;
            color: #155724;
          }
          .error {
            background-color: #f8d7da;
            color: #721c24;
          }
        </style>
      </head>
      <body>
        <h1>ESP32-CAM Image Gallery</h1>
        <p>Total images: ${imageFiles.length}</p>
        <div id="status-message" style="display: none;"></div>
        <div class="gallery">
          ${images}
        </div>
        
        <script>
          function deletePhoto(filename) {
            if (confirm('Are you sure you want to delete this photo?')) {
              fetch('/delete/' + filename, {
                method: 'DELETE',
              })
              .then(response => response.json())
              .then(data => {
                const statusDiv = document.getElementById('status-message');
                
                if (data.success) {
                  statusDiv.className = 'success';
                  statusDiv.textContent = 'Photo deleted successfully!';
                  // Remove the image div from the gallery
                  const imageElements = document.querySelectorAll('.gallery > div');
                  imageElements.forEach(div => {
                    if (div.innerHTML.includes(filename)) {
                      div.remove();
                    }
                  });
                  // Update the count
                  const countElement = document.querySelector('p');
                  const currentCount = parseInt(countElement.textContent.match(/\\d+/)[0]) - 1;
                  countElement.textContent = 'Total images: ' + currentCount;
                } else {
                  statusDiv.className = 'error';
                  statusDiv.textContent = 'Error: ' + data.message;
                }
                
                statusDiv.style.display = 'block';
                
                // Hide the message after 3 seconds
                setTimeout(() => {
                  statusDiv.style.display = 'none';
                }, 3000);
              })
              .catch(error => {
                console.error('Error:', error);
                const statusDiv = document.getElementById('status-message');
                statusDiv.className = 'error';
                statusDiv.textContent = 'Error: Failed to delete the photo.';
                statusDiv.style.display = 'block';
              });
            }
          }
        </script>
      </body>
      </html>
    `);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke on the server!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Gallery available at http://localhost:${PORT}/gallery`);
});