const express = require('express');
const urlController = require('../controllers/urlController');

const router = express.Router();

router.get('/api/health', (req, res) => res.json({ status: 'ok' }));
router.post('/api/shorten', urlController.shorten);
router.get('/:code', urlController.redirect);

module.exports = router;
