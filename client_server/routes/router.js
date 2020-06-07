const express = require('express');
const router = express.Router();
const {downloadFile, handleDownload, getDownloads} = require('../controllers/pouch_controller')
const {searchFiles, deleteDownload} = require('../controllers/file_controller')

router.post("/downloadFile", downloadFile)
router.put("/handleDownload", handleDownload)
router.get("/searchFiles", searchFiles)
router.get("/getDownloads", getDownloads)
router.delete("/deleteDownload", deleteDownload)
// router.get("/pouchSearch", pouchSearch)

module.exports = router;