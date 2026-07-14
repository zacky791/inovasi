const pool = require('../config/db');

const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High'];
const ALLOWED_STATUSES = ['processing', 'pending', 'failed'];

async function create({ imageUrl, latitude, longitude }) {
  const result = await pool.query(
    `INSERT INTO reports (image_url, latitude, longitude, status)
     VALUES ($1, $2, $3, 'processing')
     RETURNING id`,
    [imageUrl, latitude, longitude]
  );
  return findById(result.rows[0].id);
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findAll() {
  const result = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
  return result.rows;
}

async function updateAiResult(id, { issueType, severity, description, confidence, status }) {
  await pool.query(
    `UPDATE reports
     SET issue_type = $1, severity = $2, description = $3, confidence = $4, status = $5
     WHERE id = $6`,
    [issueType, severity, description, confidence, status, id]
  );
  return findById(id);
}

async function markFailed(id) {
  await pool.query(`UPDATE reports SET status = 'failed' WHERE id = $1`, [id]);
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
