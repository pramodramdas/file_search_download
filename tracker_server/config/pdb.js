const PouchDB = require('pouchdb');

const allFiles = new PouchDB(`${process.env.SERVER_POUCH}allFilesInfo`, {revs_limit: 1, auto_compaction: true});
const onlineNodes = new PouchDB(`${process.env.SERVER_POUCH}online_nodes`, {revs_limit: 1, auto_compaction: true});

const allFilesTable = () => {
    return allFiles
}

const onlineNodesTable = () => {
    return onlineNodes
}

module.exports = {
    allFilesTable,
    onlineNodesTable
}