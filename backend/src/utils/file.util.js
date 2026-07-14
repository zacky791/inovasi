const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

function getUploadPath(filename) {
  return path.join(UPLOAD_DIR, filename);
}

function getRelativeImageUrl(filename) {
  return `${UPLOAD_DIR}/${filename}`;
}

function ensureUploadDir() {
  const dir = path.resolve(UPLOAD_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  getUploadPath,
  getRelativeImageUrl,
  ensureUploadDir,
  UPLOAD_DIR,
};
