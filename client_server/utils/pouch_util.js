
const pouchGet = (db, id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let doc = await db.get(id)
            resolve({doc, err:null})
        } catch(err) {
            console.log(err)
            resolve({doc:null, err})
        }
    })
}

const pouchRemove = (db, _id, _rev) => {
    return new Promise(async (resolve, reject) => {
        try {
            await db.remove(_id, _rev)
            resolve({success:true, err:null})
        } catch(err) {
            console.log(err)
            resolve({success:false, err})
        }
    })
}

const pouchFind = (db, selector, fields, sort) => {
    return new Promise(async (resolve, reject) => {
        try {
            //console.log({selector, fields})
            let query = {selector, fields}
            
            if(sort) query.sort = sort
            
            let result = await db.find(query)
            let docs = result ? result.docs : []
            resolve({docs, err:null})
        } catch(err) {
            console.log(err)
            resolve({docs:null, err})
        }
    })
}

const pouchUpdate = (db, id, payload={}) => {
    return new Promise(async (resolve, reject) => {
        try {

            let {doc, err} = await pouchGet(db, id)
            if(err || !doc)
                return resolve({ok: false, err})

            Object.keys(payload).forEach((key) => {
                doc[key] = payload[key]
            })

            await db.put(doc)
            resolve({ok: true, err:null})
        } catch(err) {
            console.log(err)
            resolve({ok:false, err})
        }
    })
}

const pouchUpsert = (db, id, payload={}) => {
    return new Promise(async (resolve, reject) => {
        try {

            let {doc, err} = await pouchGet(db, id)
            if(err && err.status != 404)
                return resolve({ok: false, err})
            
            doc = doc || {_id:id}
            Object.keys(payload).forEach((key) => {
                doc[key] = payload[key]
            })
            
            await db.put(doc)
            resolve({ok: true, err:null})
        } catch(err) {
            console.log(err)
            resolve({ok:false, err})
        }
    })
}

//replicate is unidirectionsl either "to" or "from"
const replicateTo = (db, url) => {
    try {
        db.replicate.to(url);
    } catch(err) {
        console.log(err)
    }
}

//sync is bidirectional
const pouchSync = (db, url) => {
    try {
        db.sync(url);
    } catch(err) {
        console.log(err)
    }
}

module.exports = {
    pouchGet,
    pouchRemove,
    pouchFind,
    pouchUpdate,
    pouchUpsert,
    replicateTo,
    pouchSync
}