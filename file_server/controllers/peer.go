package controllers

import (
	"context"
	"fmt"
	"log"
	// "os"

	"github.com/pramod/file_server/pbs/filepb"
	"google.golang.org/grpc"
)

type Peer struct {
	Key               string
	Address           string //ip:port
	Up                bool
	HasFile           bool
	Busy              bool
	FileServiceClient filepb.FileServiceClient
	Conn              *grpc.ClientConn
	work              chan *Assignment
}

//peers APP_KEY : {up, hasFile}
func (p *Peer) GetConnection() error {
	if p.Conn == nil {
		opts := grpc.WithInsecure()
		ff, err := grpc.Dial(p.Address, grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(5242880), grpc.MaxCallSendMsgSize(5242880)), opts)
		if err != nil {
			log.Fatalf("could not connect: %v", err)
			return err
		}
		//defer ff.Close()
		p.FileServiceClient = filepb.NewFileServiceClient(ff)
		p.Conn = ff
	}
	//initially IDLE, after closing SHUTDOWN
	//fmt.Println("GetState", p.Conn.GetState())
	return nil
}

//accept peer as argument
func (p *Peer) CheckFileHash(FileHash string) bool {
	req := &filepb.HasFileRequest{
		FileHash: FileHash,
	}
	res, err := p.FileServiceClient.HasFile(context.Background(), req)
	if err != nil {
		fmt.Println(err)
		return false
	}
	p.HasFile = res.HasFlag
	return res.HasFlag
}
