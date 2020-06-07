const path = require('path');
const chokidar = require('chokidar');
const internalIp = require('internal-ip');
const crypto = require('crypto');
const {generateFileInfo} = require('../controllers/file_controller')
const {getFileNames, getFileStats} = require('../utils/file_util')
const {pouchRemove, pouchFind, replicateTo} = require('../utils/pouch_util')
const {allFilesTable, onlineNodesTable} = require('../config/pdb')

const inputFolder = process.env.INPUT_FOLDER
const serverPouchUrl = process.env.SERVER_POUCHDB
const appKey = process.env.APP_KEY

const readAndSync = async () => {
    try {
        const allFiles = allFilesTable()
        const fileNames = await getFileNames(inputFolder)
        const fullFilePaths = []
        if(fileNames) {
            for(let i = 0; i < fileNames.length; i++) {
                const fullFilePath = path.resolve(inputFolder, fileNames[i])
                fullFilePaths.push({fullFilePath})
                const hash = crypto.createHash('sha1')
                hash.update(`${appKey}${fullFilePath}`)

                let {mtime, size} = await getFileStats(fullFilePath)
                
                if(size > 10485760) {//greater than 10 mb
                    console.log(`file ${fileNames[i]} greater that 10MB will not be indexed`)
                    continue
                }
                mtime = new Date(mtime).getTime()
                
                let {docs, err} = await pouchFind(allFiles, {fullFilePath}, ['_id', '_rev', 'filename', 'mtime'])
     
                if(docs.length === 0) {
                    let fileInfo = await generateFileInfo(fileNames[i], inputFolder, fullFilePath)

                    fileInfo.meta.size = size //bytes
                    fileInfo.mtime = mtime
                    
                    await allFiles.put({_id:hash.digest('hex'), ...fileInfo})
                } else {
                    //compare modified time and re-index
                    if(docs[0].mtime < mtime) {
                        let fileInfo = await generateFileInfo(fileNames[i], inputFolder, fullFilePath)
                        fileInfo.meta.size = size //bytes
                        fileInfo.mtime = mtime

                        let deleteResponse = await pouchRemove(allFiles, docs[0]['_id'], docs[0]['_rev'])

                        if(deleteResponse.err)
                            return

                        await allFiles.put({_id:hash.digest('hex'), ...fileInfo})
                    }
                }
            }
        }

        //handle deleted files when app was down
        let allDeletedFiles = await pouchFind(allFiles, {"$nor":fullFilePaths}, ['_id', '_rev', 'filename', 'mtime'])

        if(allDeletedFiles.docs && allDeletedFiles.docs.length > 0) {
            for(let j = 0; j < allDeletedFiles.docs.length; j++) {
                await pouchRemove(allFiles, allDeletedFiles.docs[j]['_id'],allDeletedFiles.docs[j]['_rev'])
            }
        }

        watchFileModification()
        replicateTo(allFiles, `${serverPouchUrl}allFilesInfo`)
    } catch(err) {
        console.log(err)
    }
}


const watchFileModification = () => {
    try {
        const watcher = chokidar.watch(inputFolder, { persistent: true, ignoreInitial:true});
        const allFiles = allFilesTable()
        //assumption is that there are no directories
        watcher
            .on('add', async function(filePath) {
                console.log('File', filePath, 'has been added', path.basename(filePath));
                const fileName = path.basename(filePath)
                const fullFilePath = path.resolve(inputFolder, fileName)
                const hash = crypto.createHash('sha1')
                hash.update(`${appKey}${fullFilePath}`)

                let {mtime, size} = await getFileStats(fullFilePath)
                if(size > 10485760) {//greater than 10 mb
                    console.log(`file ${fileName} greater that 10MB will not be indexed`)
                    return
                }
                mtime = new Date(mtime).getTime()
                
                let fileInfo = await generateFileInfo(fileName, inputFolder, fullFilePath)
                fileInfo.meta.size = size //bytes
                fileInfo.mtime = mtime

                await allFiles.put({_id:hash.digest('hex'), ...fileInfo})
                replicateTo(allFiles, `${serverPouchUrl}allFilesInfo`)
            })
            .on('change', async function(filePath) {
                console.log('File', filePath, 'has been changed', path.basename(filePath));
                let fileName = path.basename(filePath)
                let fullFilePath = path.resolve(inputFolder, fileName)
                const hash = crypto.createHash('sha1')
                hash.update(`${appKey}${fullFilePath}`)
                
                let {docs, err} = await pouchFind(allFiles, {fullFilePath}, ['_id', '_rev', 'filename', 'mtime'])

                if(docs && docs.length > 0)
                    await pouchRemove(allFiles, docs[0]['_id'], docs[0]['_rev'])

                let {mtime, size} = await getFileStats(fullFilePath)
                if(size > 10485760) {//greater than 10 mb
                    console.log(`file ${fileName} greater that 10MB will not be indexed`)
                    return
                }
                mtime = new Date(mtime).getTime()
                let fileInfo = await generateFileInfo(fileName, inputFolder, fullFilePath)
                fileInfo.meta.size = size //bytes
                fileInfo.mtime = mtime
                await allFiles.put({_id:hash.digest('hex'), ...fileInfo})
                replicateTo(allFiles, `${serverPouchUrl}allFilesInfo`)
            })
            .on('unlink', async function(filePath) {
                console.log('File', filePath, 'has been removed', path.basename(filePath));
                let fileName = path.basename(filePath)
                let fullFilePath = path.resolve(inputFolder, fileName)
                const hash = crypto.createHash('sha1')
                hash.update(`${appKey}${fullFilePath}`)

                let {docs, err} = await pouchFind(allFiles, {fullFilePath}, ['_id', '_rev', 'filename', 'mtime'])
                
                if(docs && docs.length > 0)
                    await pouchRemove(allFiles, docs[0]['_id'], docs[0]['_rev'])
                
                replicateTo(allFiles, `${serverPouchUrl}allFilesInfo`)
            })
            .on('error', function(error) {c
                console.error('Error happened', error);
            })
    } catch(err) {
        console.log(err)
    }
}

const syncOnline = () => {
    try {       
        const onlineNodes = onlineNodesTable() 
        setInterval(async () => {
            let {docs, err} = await pouchFind(onlineNodes, {_id:appKey}, ['_id', '_rev'])
            let ip = `${internalIp.v4.sync()}:${process.env.GRPC_PORT}`
            if(docs && docs.length > 0)
                await onlineNodes.put({_id:appKey, _rev:docs[0]['_rev'], ip, lastUpdated: Date.now()})  
            else
                await onlineNodes.put({_id:appKey, ip, lastUpdated: Date.now()})
        }, 5000)       
    } catch(err) {
        console.log(err)
    }
}

module.exports = {
    readAndSync,
    watchFileModification,
    syncOnline
}
