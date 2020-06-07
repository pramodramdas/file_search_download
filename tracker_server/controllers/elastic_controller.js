const {allFilesTable} = require('../config/pdb')
const {getElasticClient} = require('../config/elasticdb')

const syncPouchToElastic = async () => {
    let allFiles = allFilesTable()
    let client = getElasticClient()
    console.log('started sync from pouchdb to elastic')
    try {
        var result = await allFiles.allDocs({
          include_docs: true
        });

        result.rows.forEach(async (fileDoc) => {
            delete fileDoc.doc._id
            await client.update({
                index: 'allfiles',
                type: 'fileInfo',
                id: fileDoc.id,
                body: {
                    doc: fileDoc.doc,
                    doc_as_upsert: true
                }
            });
        })
        
        watchPouchChanges()
      } catch (err) {
        console.log(err);
      }
}

const watchPouchChanges = () => {
    try {
        let allFiles = allFilesTable()
        let client = getElasticClient()
        console.log('watch pouchdb for changes')
        allFiles.changes({
            since: 'now',
            live: true,
            include_docs: true
        }).on('change', async (change, a) => {
            // change.id contains the doc id, change.doc contains the doc
            if (change.deleted) {
                console.log('file deleted')
                await client.delete({index: 'allfiles', id:change.id})
            } else {
                console.log('File changed/added')
                delete change.doc._id
                await client.update({
                    index: 'allfiles',
                    type: 'fileInfo',
                    id: change.id,
                    body: {
                        doc: change.doc,
                        doc_as_upsert: true
                    }
                });
            }
        }).on('error', (err) => {
            // handle errors
            console.log(err)
        });
    } catch(err) {
        console.log(err)
    }
}


const dropExistingElasticIndexes = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let client = getElasticClient()
            console.log('drop index "allfiles" if exist')
            await client.deleteByQuery({
                index: 'allfiles',
                type: 'fileInfo',
                body: {query: {match_all: {}}}
            })
            resolve()
        } catch(err) {
            if(err.meta && err.meta.statusCode === 404)
                resolve()
            else
                reject(err)
        }
    })
}

const searchFiles = async (req, res) => {
    try {
        let {keyword, pageNumber, pageSize} = req.query;

        if(!keyword)
            return res.json({success:false, msg:'keyword mandatory'})

        pageNumber = parseInt(pageNumber) || 1
        pageSize = parseInt(pageSize) || 10
        let start = (pageNumber - 1) * pageSize
        let numOfRecords = pageSize

        let client = getElasticClient()
        let docs = await client.search({
            index: 'allfiles',
            type: 'fileInfo',
            body: {query: {"query_string" : {"query" : `*${keyword}*`}}},
            from: start,
            size: numOfRecords,
            _source_excludes: ["content", "fullFilePath"]
        })

        if(docs && docs.body && docs.body.hits && docs.body.hits.hits) {
            let hits = docs.body.hits
            return res.json({success:true, result:hits.hits, total: (hits.total && hits.total.value), pageNumber, pageSize})
        }
        else
            return res.json({success:false, msg:'error'})
    } catch(err) {
        console.log(err)
        return res.json({success:false, msg:'error'})
    }
}

module.exports = {
    syncPouchToElastic,
    dropExistingElasticIndexes,
    searchFiles
}