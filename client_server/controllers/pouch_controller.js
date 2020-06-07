const fs = require('fs')
const {allFilesTableServer, onlineNodesTable, downloadsTable} = require('../config/pdb')
const {pouchFind, pouchUpdate} = require('../utils/pouch_util')

const getPeersInfoByFileHash = (fileHash) => {
    return new Promise(async (resolve, reject) => {
        let peersInfo = []
        try {
            let allFiles = allFilesTableServer()
            let {docs, err} = await pouchFind(allFiles, {"meta.fileHash":fileHash}, ['_id', '_rev', 'appKey'])
    
            if(docs && docs.length > 0) {
                let allPeers = docs.map(d => d.appKey)
    
                let onlineNodes = onlineNodesTable()
                //don't consider peers which have not sent hearbeat for last one minute
                onlinePeersInfo = await pouchFind(onlineNodes, {"_id":{"$in":allPeers}, "lastUpdated":{"$gt":(Date.now() - 60000)}}, ['_id', '_rev', 'ip'])
                //onlinePeersInfo = await pouchFind(onlineNodes, {"_id":{"$in":allPeers}}, ['_id', '_rev', 'ip'])
 
                if(onlinePeersInfo.docs && onlinePeersInfo.docs.length > 0) {
                    peersInfo = onlinePeersInfo.docs.map((pi) => {return{"peerID": pi["_id"], "address":pi["ip"]}})
                }
            } 
            
            return resolve({peersInfo, err:null})
        } catch(err) {
            console.log(err)
            resolve({peersInfo, err})
        }
    })
}

const downloadFile = async (req, res) => {
    try {
        let {fileHash, fileName, piecesHash = [], type} = req.body

        if(!fileHash || !fileName || !type)
            return res.json({success:false, msg:"missing mandatory fileHash, fileName, piecesHash, type"})

        if (fs.existsSync(`${process.env.DOWNLOAD_LOCATION}/${fileName}`)) {
            return res.json({success:false, msg:"download file already exists"})
        }

        let {peersInfo, err} = await getPeersInfoByFileHash(fileHash)
        if(err || !peersInfo)
            return res.json({success:false, msg:"error"})

        let downloads = downloadsTable()
        let prevDownload = await pouchFind(downloads, {"_id":fileHash})
        let currDate = Date.now() 
        let pieceSize = parseInt(process.env.PIECE_SIZE)
        if(prevDownload && prevDownload.docs && prevDownload.docs.length > 0) {
            let pDownload = prevDownload.docs[0]
            if(prevDownload.docs[0].done)
                return res.json({success:true, msg:"download already complete"})

            await downloads.put({_id:fileHash, _rev:pDownload["_rev"], fileHash, pieceSize, fileName, piecesHash, type, peersInfo, start:pDownload['start'], done:pDownload['done'], createdOn:pDownload['createdOn'], modifiedOn:currDate})
        }
        else
            await downloads.put({_id:fileHash, fileHash, fileName, pieceSize, piecesHash, type, peersInfo, start:true, done:false, createdOn:currDate, modifiedOn:currDate})        

        return res.json({success:true})
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:"error"})
    }
}

const handleDownload = async (req, res) => {
    try {
        let {fileHash, start} = req.body
        
        if(!fileHash)
            return res.json({success:false, msg:"fileHash missing"})
        
        let downloads = downloadsTable()
        
        if(start !== true && start !== false)
            return res.json({success:false, msg:"start should be boolean"})

        await pouchUpdate(downloads, fileHash, {start})

        return res.json({success:true})
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:"error"})
    }
}

const getDownloads = async (req, res) => {
    try {
        let downloads = downloadsTable()
        let {docs, err} = await pouchFind(downloads, {}, ['_id', '_rev', 'start', 'done', 'pieceSize', 'fileHash', 'fileName', 'peersInfo', 'type', 'createdOn', 'modifiedOn'], [{createdOn: 'desc'}])
        
        if(docs && docs.length > -1) {
            return res.json({success:true, downloads:docs})
        }
        return res.json({success:false, downloads:[]})
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:"error", downloads:[]})
    }
}

module.exports = {
    downloadFile,
    handleDownload,
    getDownloads
}