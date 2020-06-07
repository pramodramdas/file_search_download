const {exec} = require('child_process');
// "start": "npm start --prefix client_server/ && cd file_server && go run server.go"
const servers = Promise.all([
    exec('cd file_server && go run server.go').stdout.pipe(process.stdout),
    exec('npm start --prefix client_server/').stdout.pipe(process.stdout)
])
