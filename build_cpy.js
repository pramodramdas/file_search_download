const ncp = require('ncp').ncp;

ncp.limit = 16;

var src = './frontend/build'
var dest = './client_server/build'

console.log('Copying build files');
ncp(src, dest, function (err) {
  if (err) {
    return console.error(err);
  }
  console.log('Copying build files complete');
});