const path = require('path')
const mime = require('mime-types');

class FileInfo {
    constructor(filename, filepath, appKey) {
        if(!filename || !filepath || !appKey)
            throw Error('filename, filepath and appKey mandatory')
        this.filename = filename
        this.filepath = filepath
        this.mtime = 0
        this.fullFilePath = path.resolve(filepath, filename)
        this.appKey = appKey,
        this.meta = {
            filename: filename,
            type: mime.lookup(filename),
            fileHash: null,
            piecesHash: [],
            size: 0, //bytes
            pieceLength: 0
        }
        this.content = null
    }

    toJSON() {
        return {
            filename: this.filename,
            filepath: this.filepath,
            fullFilePath: this.fullFilePath,
            appKey: this.appKey,
            meta: this.meta,
            content: this.content
        }
    }
}

module.exports =  FileInfo