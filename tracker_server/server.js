require('dotenv').config()
const express = require('express');
const  bodyParser = require('body-parser');
const cors = require('cors');
const router = require('./routes/router')
const {syncPouchToElastic, dropExistingElasticIndexes} = require('./controllers/elastic_controller')

const app = express();

app.use(bodyParser.json())
app.use(cors());

app.use('/tracker', router)

app.listen(process.env.HTTP_PORT, async () => {
    await dropExistingElasticIndexes()
    syncPouchToElastic()
});
