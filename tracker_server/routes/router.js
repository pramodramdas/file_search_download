const express = require('express');
const router = express.Router();
const {searchFiles} = require('../controllers/elastic_controller')

router.get('/searchFiles', searchFiles)

module.exports = router;