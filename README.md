# file_search_download  
Index, search and download files within intranet. some of the implementations is inspired from bittorrent protocol like tracker server, file pieces and dowmloading file pieces from different peers  

- #### File server (golang grpc server and grpc client)  
- #### Tracker server (nodejs express)  
- #### Peer (nodejs express)  

## Architecture  
- #### Load and sync file info to tracker server
![alt text](https://github.com/pramodramdas/file_search_download/blob/master/images/Sync.png?raw=true)  
- #### Search keyword in file info indexs
![alt text](https://github.com/pramodramdas/file_search_download/blob/master/images/index_ping_search.png?raw=true)  
- #### Download file pieces from peers' grpc server
![alt text](https://github.com/pramodramdas/file_search_download/blob/master/images/file_download.png?raw=true)  

## Application Flow
1. When peer boots, it starts reading files from INPUT_FOLDER  
    a. if file info is already present then check modifed time, if modified then replace file info in pouchdb  
    b. if file info not present then insert to pouchdb  
    c. sync peer file info to global pouchdb, this is one way directed from local pouchdb to global pouchdb.  
    d. peer adding heartbeat entry to global pouchdb every 5 seconds 
    
2. Peer after boot, keeps watch on INPUT_FOLDER  
    a. If any file gets added then that will be added to file info table(peer pouchdb)  
    b. If any file gets removed then that will be removed from file info table(peer pouchdb)  
    c. If any file gets modified the that will replaced in file info table(peer pouchdb)  
    d. sync peer file info to global pouchdb, this is one way directed from local pouchdb to global pouchdb.  
    
3. Tracker server when boots  
    a. It will drop all elastic search file info indexes.  
    b. reads all file info from global pouchdb and indexes them.  
    
4. Tracker server after boot, keeps watch on global pouchdb file info table  
    a. If any file gets added then that will be indexed in elasticsearch  
    b. If any file gets removed then index will be removed from elasticsearch  
    c. If any file gets modified then that index will be replaced in elasticsearch  
    
5. Peer's file server when booted  
    a. grpc server starts  
    b. grpc clients starts and watches for downloads table for changes  
    
6. Peer can search for any keyword  
    a. serach keyword using peer's inteface  
    b. request goes to tracker server  
    c. tracker server searches keyword in elasticsearch and returns result  
    d. peer collects all peer id from result and checks if peers are active for last one minute  
    e. peer then creates download in pouchdb's download table with only active peers  
    
7. Downloading file(file server)  
    a. when grpc client detects download, it fetches peers list and makes bidirection stream connection to grpc server of 
       those peers.  
    b. after connecting, sends file hash to each peer's grpc server to check if file exists.  
    c. if grpc server has that file, then grpc client starts requesting for file piece.  
    d. different piece will be requested to different peer's grpc server  
    e. grpc client, when receives file piece hashes it and verifies if hash matches  
    f. if piece hash doesn't match then discards piece and diconnects from that peer.  
    g. after receving all pieces, it merges all pieced in order, creates single file and saves into DOWNLOAD_LOCATION  

## Steps to start

1. Install and start golbal pouchdb server which will be mainly used by tracker server  
    ```npm install -g pouchdb-server```  
    ```pouchdb-server --port 5984```
    or
    ```pouchdb-server --port 5984 --in-memory```  

2. Install and start elasticsearch server

3. Run tracker server  
    - Edit env of tracker_server  
        SERVER_POUCH = http url of golbal pouchdb server  
        ELASTIC_URL = http url of elasticsearch server  
        HTTP_PORT = http port of tracker server  
        
    - Start tracker_server  
        ```npm run start  ```

4. Run peers and peers' file servers (create n number of peers)  
    - Run local pouchdb server for each peer  
        ```pouchdb-server --port 3030  ```
        or
        ```pouchdb-server --port 3030 --in-memory  ```  
        
    - Edit env of peer's file_server  
        DOWNLOAD_LOCATION = relative path of download folder where files will be downloaded  
        SERVER_POUCHDB = http url of golbal pouchdb server  
        LOCAL_POCHDB = http url of peer pouchdb server  
        GRPC_PORT = peer's grpc port number  
        
    - Edit env of peer  
        INPUT_FOLDER = relative path of sharable folder  
        APP_KEY = peer id, should be unique for each peer  
        PIECE_SIZE = size of pieces that file will be divided into  
        GRPC_PORT = peer's grpc port number  
        SERVER_POUCHDB = http url of golbal pouchdb server  
        LOCAL_POCHDB = http url of peer pouchdb server  
        TRACKER_SERVER = http url of tracker server  
        DOWNLOAD_LOCATION = relative path of download folder where files will be downloaded  
        HTTP_PORT = http port of peer  
        
    - Start peer prod (from root folder)  
        * To build and start prod  
            ```npm run build_start  ```
        * To only start  
            ```npm run start  ```  
            
    - Start peer dev (from root folder)  
        * To start dev  
            ```npm run start  ```  
            
    - Start peer dev frontend (from frontend folder)  
        * Edit package.json  
            ```"proxy": http url of peer  ```  
        * To start dev  
            ```npm run start  ```

If started in dev mode visit http://localhost:3000  
If started in prod mode visit http://localhost:(peer's HTTP_PORT)

#### Note:  
* Files should be less than 10mb, tested with 7mb.
* txt files tested, for other types refer npm textract.  

File info is saved in the below structure, meta.fileHash is hash if whole file,
appKey is peerId set in env(APP_KEY), piecesHash is array of file pieces hash based on 
env(PIECE_SIZE)
```
{
  "_id": "66048231fdbd697124f7bf7abb2e6acea501fad4",
  "filename": "bb.txt",
  "filepath": "../resources/",
  "fullFilePath": "full file path of file",
  "appKey": "peer id",
  "meta": {
    "filename": "bb.txt",
    "type": "text/plain",
    "fileHash": "adb42f5ea538d8dd0554dca39e456602fefe9098",
    "piecesHash": [
      "adb42f5ea538d8dd0554dca39e456602fefe9098"
    ],
    "size": 11
  },
  "content": "yyyyy code",
  "mtime": 1590828870000
}
````

structure of online peers info(heartbeat) in tracker, _id is peer id, lastUpdated is time stamp of latest heart beat
and ip is the address of peer's grpc file server
```
{
  "_id": "bbb",
  "ip": "Intranet ip:50051",
  "lastUpdated": 1591626662100,
  "_rev": "59-3c497e8965903f8227083056d5650e37"
}
```
