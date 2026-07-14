const express = require('express');
const upload = require('../middlewares/upload.middleware');
const reportController = require('../controllers/report.controller');

const router = express.Router();

router.post('/', upload.single('image'), reportController.createReport);
router.get('/', reportController.getAllReports);
router.get('/:id', reportController.getReportById);

module.exports = router;
