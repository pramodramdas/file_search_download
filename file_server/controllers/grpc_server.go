package controllers

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	//"time"

	"github.com/pramod/file_server/pbs/filepb"
	utils "github.com/pramod/file_server/utils"
	"google.golang.org/grpc"
)

type server struct{}

func NewServer() *server {
	return &server{}
}

func (*server) HasFile(ctx context.Context, req *filepb.HasFileRequest) (*filepb.HasFileResponse, error) {
	Fields := []string{}
	Fields = append(Fields, "filename")
	Fields = append(Fields, "fullFilePath")
	Fields = append(Fields, "_doc")
	Fields = append(Fields, "_rev")
	findResponse, err := utils.FindDocs("allFilesInfo", map[string]interface{}{
		"meta.fileHash": req.FileHash,
	}, Fields)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	HasFlag := false
	if len(findResponse.Docs) > 0 {
		HasFlag = true
	}
	res := &filepb.HasFileResponse{
		HasFlag: HasFlag,
	}
	return res, nil
}

func (*server) GetPiece(stream filepb.FileService_GetPieceServer) error {
	fmt.Println("GRPC GetPiece function was invoked")
	// const BufferSize = 1024 //256 * 1024
	var BufferSize int64
	for {
		// time.Sleep(1000 * time.Millisecond)
		req, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			fmt.Printf("Error while reading client stream: %v", err)
			return err
		}

		BufferSize = req.PieceSize
		Fields := []string{}
		Fields = append(Fields, "filename")
		Fields = append(Fields, "fullFilePath")
		Fields = append(Fields, "_doc")
		Fields = append(Fields, "_rev")
		findResponse, err := utils.FindDocs("allFilesInfo", map[string]interface{}{
			"meta.fileHash": req.FileHash,
		}, Fields)

		if err != nil {
			return err
		}
		if len(findResponse.Docs) == 0 {
			return errors.New("no matching file")
		}

		doc := findResponse.Docs[0].(map[string]interface{})
		start := req.GetStart()
		fmt.Println("start ", start)
		file, err := os.Open(doc["fullFilePath"].(string))
		if err != nil {
			fmt.Println(err)
			return err
		}
		defer file.Close()

		buffer := make([]byte, BufferSize)

		bytesread, err := file.ReadAt(buffer, start)
		fmt.Println("bytes read: ", bytesread)
		//fmt.Println("bytestream to string: ", string(buffer))
		res := &filepb.FileChunkResponse{
			Start:     start,
			PieceHash: "",
			Chunk:     buffer, // buffer[:bytesread],
		}
		sendErr := stream.Send(res)
		if sendErr != nil {
			fmt.Printf("Error while sending data to client: %v", sendErr)
			return sendErr
		}
	}
}

func StartGrpcServer() error {
	fmt.Println("GRPC server about to start")
	lis, err := net.Listen("tcp", ":"+os.Getenv("GRPC_PORT"))
	if err != nil {
		log.Fatalf("Failed to listen %v", err)
	}

	s := grpc.NewServer()
	filepb.RegisterFileServiceServer(s, &server{})

	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
		return err
	}
	return nil
}
