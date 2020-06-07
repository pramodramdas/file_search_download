const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto')
const textract = require('textract');

const getFileNames = (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            let fileNames = []
            fs.readdirSync(filePath).forEach(async file => {
                fileNames.push(file)
            });
            resolve(fileNames)
        } catch(err) {
            console.log(err)
            reject()
        }
    })
}

const getFileStats = (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const stats = fs.statSync(filePath);
            resolve({mtime: stats.mtime, size:stats.size})
        } catch(err) {
            console.log(err)
            reject()
        }
    })
}

const generateFileHash = (fullFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const hash = crypto.createHash('sha1')
            const rs = fs.createReadStream(fullFilePath)
            rs.on('error', (err) => resolve({fileHash:null, err}))
            rs.on('data', chunk => hash.update(chunk))
            rs.on('end', () => resolve({fileHash: hash.digest('hex'), err:null}))
        } catch(err) {
            console.log(err)
            resolve({fileHash:null, err})
        }
    })
}

const generatePieces = (fullFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            let readStream = fs.createReadStream(fullFilePath,{ highWaterMark: 256 * 1024 });
            readStream.on('data', function(chunk) {
                console.log('chunk Data : ')
                console.log(chunk);   
            }).on('end', function() {
                resolve({})
            // here you see all data processed at end of file
            }).on('error', function() {
                readStream.destroy()
            })
        } catch(err) {
            console.log(err)
            resolve({})
        }
    })
}

const generateHashPieces = (fullFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            let piecesHash = []
            //256 * 1024
            let readStream = fs.createReadStream(fullFilePath, { highWaterMark: parseInt(process.env.PIECE_SIZE) });
            readStream.on('data', function(chunk) {
                const hash = crypto.createHash('sha1')
                hash.update(chunk)
                piecesHash.push(hash.digest('hex'))
            }).on('end', function() {
                resolve({piecesHash, err:null})
            }).on('error', function(err) {
                readStream.destroy()
                console.log(err)
                resolve({piecesHash:[], err})
            })
        } catch(err) {
            console.log(err)
            resolve({piecesHash:[], err})
        }
    })
}

const extractText = (fullFilePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            let func = util.promisify(textract.fromFileWithPath)
            let text = await func(fullFilePath)
            resolve({text, err:null})
        } catch(err) {
            console.log(err)
            resolve({text:null, err})
        }
    })
}

module.exports = {
    getFileNames,
    getFileStats,
    generateFileHash,
    generatePieces,
    generateHashPieces,
    extractText
}