require('dotenv').config()
const express = require('express');
const  bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const {readAndSync, syncOnline} = require('./controllers/sync_controller')
const router = require('./routes/router');

const app = express();

app.use(bodyParser.json())
app.use(cors());
app.use(express.static('build'));

// app.get('/test', (req, res) => {
//     res.send('Hi')
// })

app.use('/sync', router)

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

const server = app.listen(process.env.HTTP_PORT, async () => {
    readAndSync()
    syncOnline()
});
require('./utils/socket_util').initSocket(server);

