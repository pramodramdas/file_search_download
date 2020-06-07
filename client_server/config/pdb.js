const PouchDB = require('pouchdb');
const {pouchUpsert} = require('../utils/pouch_util')
const {refreshDownloads} = require('../utils/socket_util')

PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-quick-search'));

const allFiles = new PouchDB(`${process.env.LOCAL_POCHDB}allFilesInfo`, {revs_limit: 1, auto_compaction: true});
const onlineNodes = new PouchDB(`${process.env.SERVER_POUCHDB}online_nodes`, {revs_limit: 1, auto_compaction: true});
const allFilesServer = new PouchDB(`${process.env.SERVER_POUCHDB}allFilesInfo`, {revs_limit: 1, auto_compaction: true});
const downloads = new PouchDB(`${process.env.LOCAL_POCHDB}downloads`, {revs_limit: 1, auto_compaction: true});
const downloadStatus = new PouchDB(`${process.env.LOCAL_POCHDB}downloadStatus`, {revs_limit: 1, auto_compaction: true});

const allFilesTable = () => {
    return allFiles
}

const onlineNodesTable = () => {
    return onlineNodes
}

const allFilesTableServer = () => {
    return allFilesServer
}

const downloadsTable = () => {
    return downloads
}

const downloadStatusTable = () => {
    return downloadStatus
}


const pouchInit = async () => {
    // await pouchUpsert(downloads, "_design/app", {
    //     "filters": {
    //         "incomplete": "function(doc, req) { if(doc.done == true) { return false; } else { return true; }}"
    //     }
    // })
    
    await pouchUpsert(downloads, "_design/beforeComplete", {
        "filters": {
            "incomplete": "function(doc, req) { if(doc.done == false) { return true; } else { return false; }}"
        }
    })

    await pouchUpsert(downloads, "_design/afterComplete", {
        "filters": {
            "complete": "function(doc, req) { if(doc.start == false && doc.done == true) { return true; } else { return false; }}"
        }
    })

    await downloads.createIndex({
        index: {
          fields: ['createdOn'],
          name: 'downoadsCreatedOn'
        }
    });

    downloads.changes({
        since: 'now',
        live: true,
        filter: 'afterComplete/complete',
        include_docs: true
    }).on('change', async (change, a) => {
        if (!change.deleted) {
            refreshDownloads()
        }
    }).on('error', (err) => {
        // handle errors
        console.log(err)
    });
}

pouchInit()

module.exports = {
    allFilesTable,
    onlineNodesTable,
    allFilesTableServer,
    downloadsTable,
    downloadStatusTable
}