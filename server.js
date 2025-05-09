const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Azure Blob Storage setup
const { BlobServiceClient } = require('@azure/storage-blob');
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const app = express();
app.use(cors());

// Initialize Azure Blob Client
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('esp32-photos');

// Simplified in-memory upload (Azure will handle storage)
const upload = multer({ storage: multer.memoryStorage() });

// Upload endpoint
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const blobName = `esp32-${Date.now()}.jpg`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(req.file.buffer, req.file.size);
    
    const photoUrl = `https://${blobServiceClient.accountName}.blob.core.windows.net/esp32-photos/${blobName}`;
    
    res.json({
      success: true,
      url: photoUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gallery endpoint
app.get('/gallery', async (req, res) => {
  try {
    let photos = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      photos.push({
        name: blob.name,
        url: `https://${blobServiceClient.accountName}.blob.core.windows.net/esp32-photos/${blob.name}`,
        timestamp: blob.properties.createdOn
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32-CAM Azure Gallery</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .photo { margin: 20px; padding: 20px; border: 1px solid #ddd; }
          img { max-height: 300px; }
        </style>
      </head>
      <body>
        <h1>ESP32-CAM Photos on Azure</h1>
        ${photos.map(photo => `
          <div class="photo">
            <h3>${photo.name}</h3>
            <img src="${photo.url}" loading="lazy">
            <p>Uploaded: ${new Date(photo.timestamp).toLocaleString()}</p>
          </div>
        `).join('')}
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload endpoint: POST /upload`);
  console.log(`Gallery: GET /gallery`);
});