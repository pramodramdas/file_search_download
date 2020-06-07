const fs = require('fs')
const axios = require('axios');
const FileInfo = require('../models/file_info')
const {    
    generateFileHash,
    generateHashPieces,
    extractText } = require('../utils/file_util')
const {downloadsTable} = require('../config/pdb')
const {pouchRemove} = require('../utils/pouch_util')

const generateFileInfo = (filename, inputFolder, fullFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            let fileInfo = new FileInfo(filename, inputFolder, process.env.APP_KEY)
            
            let extractResponse = await extractText(fullFilePath)
            fileInfo.content = extractResponse.text
            
            let fileHashResponse = await generateFileHash(fullFilePath)
            
            if(fileHashResponse.err)
                reject(fileHashResponse.err)

            fileInfo.meta.fileHash = fileHashResponse.fileHash

            let hashedPieces = await generateHashPieces(fullFilePath)
           
            if(hashedPieces.err)
                reject(hashedPieces.err)

            fileInfo.meta.piecesHash = hashedPieces.piecesHash

            resolve(fileInfo.toJSON())
        } catch(err) {
            console.log(err)
            reject(err)
        }
    })
}

const searchFiles = async (req, res) => {
    try {
        let {keyword, pageNumber, pageSize} = req.query
        
        if(!keyword)
            return res.json({success:false, msg:'keyword mandatory'})
        
        let response = await axios.get(`${process.env.TRACKER_SERVER}tracker/searchFiles?keyword=${keyword}&pageNumber=${pageNumber}&pageSize=${pageSize}`,
            {responseType: 'stream'})
        
        response.data.pipe(res)
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:'error'})
    }
}

const deleteDownload = async (req, res) => {
    let {all=false, _id, _rev, fileName} = req.body

    try {
        if(!_id || !_rev || !fileName)
            return res.json({success:false, msg:"_id, _rev and fileName missing"})
        
        let downloads = downloadsTable()
        await pouchRemove(downloads, _id, _rev)

        if(all)
            fs.unlink(`${process.env.DOWNLOAD_LOCATION}/${fileName}`, (err) => {
                console.log(err)
            })

        return res.json({success:true})  
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:'error'})       
    }
}

module.exports = {
    generateFileInfo,
    searchFiles,
    deleteDownload
}