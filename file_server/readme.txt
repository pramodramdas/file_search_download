go mod init github.com/pramod/file_server


mkdir -p google/api    
curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/annotations.proto > google/api/annotations.proto     
curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/http.proto > google/api/http.proto

//for only grpc
protoc pbs/hellopb/hello.proto --go_out=plugins=grpc:. 

//for grpc + gateway
protoc pbs/hellopb/hello.proto --go_out=plugins=grpc:. --grpc-gateway_out=logtostderr=true:.