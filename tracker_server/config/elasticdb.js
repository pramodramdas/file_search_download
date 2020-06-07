const { Client } = require('@elastic/elasticsearch')

const client = new Client({
    node: process.env.ELASTIC_URL,
    maxRetries: 5,
    requestTimeout: 60000,
    sniffOnStart: true
})

const getElasticClient = () => {
    return client
}

module.exports = {
    getElasticClient
}