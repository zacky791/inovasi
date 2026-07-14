const pool = require('../config/db');

const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High'];
const ALLOWED_STATUSES = ['processing', 'pending', 'failed'];

async function create({ imageUrl, latitude, longitude }) {
  const [result] = await pool.execute(
    `INSERT INTO reports (image_url, latitude, longitude, status)
     VALUES (?, ?, ?, 'processing')`,
    [imageUrl, latitude, longitude]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM reports WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM reports ORDER BY created_at DESC'
  );
  return rows;
}

async function updateAiResult(id, { issueType, severity, description, confidence, status }) {
  await pool.execute(
    `UPDATE reports
     SET issue_type = ?, severity = ?, description = ?, confidence = ?, status = ?
     WHERE id = ?`,
    [issueType, severity, description, confidence, status, id]
  );
  return findById(id);
}

async function markFailed(id) {
  await pool.execute(
    `UPDATE reports SET status = 'failed' WHERE id = ?`,
    [id]
  );
  return findById(id);
}

module.exports = {
  create,
  findById,
  findAll,
  updateAiResult,
  markFailed,
  ALLOWED_SEVERITIES,
  ALLOWED_STATUSES,
};
