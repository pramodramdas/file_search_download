package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	//"time"
	_ "github.com/go-kivik/couchdb/v4"
	"github.com/pramod/file_server/pbs/filepb"
	utils "github.com/pramod/file_server/utils"
)

//key fileHash
var Downloads map[string]*Download = make(map[string]*Download)

type PeersInfo struct {
	PeerID  string `json:"peerID"`
	Address string `json:"address"`
}

type Changes struct {
	ID      string `json:"id"`
	Changes []struct {
		Rev string `json:"rev"`
	} `json:"changes"`
	Doc Doc `json:"doc"`
	Seq int `json:"seq"`
}

type Doc struct {
	Status     string      `json:"status"`
	FileHash   string      `json:"fileHash"`
	FileName   string      `json:"fileName"`
	PieceSize  int64       `json:"pieceSize"`
	PiecesHash []string    `json:"piecesHash"`
	PeersInfo  []PeersInfo `json:"peersInfo"`
	Start      bool        `json:"start"`
	ID         string      `json:"_id"`
	Rev        string      `json:"_rev"`
}

func WatchDownload() {
	client := &http.Client{Transport: &http.Transport{
		DisableCompression: true,
	}}

	ctx, _ := context.WithCancel(context.Background())

	req, err := http.NewRequest("GET", fmt.Sprintf("%sdownloads/_changes?feed=continuous&include_docs=true&filter=beforeComplete/incomplete", os.Getenv("LOCAL_POCHDB")), nil)
	if err != nil {
		fmt.Println(err)
	}
	req.Header.Add("Content-Type", "application/json")
	req = req.WithContext(ctx)
	resp, err := client.Do(req)

	if err != nil {
		fmt.Println(err)
	}
	defer resp.Body.Close()

	result := make([]byte, 15728640) //15mb
	for {
		l, err := resp.Body.Read(result)
		if l == 0 && err != nil {
			break // this is super simplified
		}
		fmt.Printf("%s", result[:l])
		var changes Changes
		//fmt.Println(string(changes) == "\n")
		if string(result[:l]) != "\n" {
			err = json.Unmarshal(result[:l], &changes)
			if err != nil {
				log.Printf("error decoding response: %v", err)
				if e, ok := err.(*json.SyntaxError); ok {
					log.Printf("syntax error at byte offset %d", e.Offset)
				}
			}

			fileName := changes.Doc.FileName

			if fileName == "" { //handle _design/app
				continue
			}

			isFileAreadyDownloaded := utils.CheckFolderOrFileExists(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), fileName))
			if isFileAreadyDownloaded {
				fmt.Println("file already exists")
				continue
			}

			if changes.Doc.Start == true {
				Start(changes.Doc)
			} else {
				Stop(changes.Doc)
			}
		}
	}
}

func Stop(doc Doc) {
	fileHash := doc.FileHash
	if Downloads[fileHash] != nil && Downloads[fileHash].Start == true {
		fmt.Println("stopping .....")
		Downloads[fileHash].Start = false
		Downloads[fileHash].StopDownload()
	}
}

func Start(doc Doc) {
	fileHash := doc.FileHash
	fileName := doc.FileName
	piecesHash := doc.PiecesHash
	pieceSize := doc.PieceSize
	id := doc.ID
	rev := doc.Rev
	if Downloads[fileHash] == nil || Downloads[fileHash].Start == false {
		fmt.Println("starting .....")
		if Downloads[fileHash] == nil {
			Downloads[fileHash] = &Download{ID: id, Rev: rev, FileHash: fileHash, FileName: fileName, PieceSize: pieceSize, PiecesHash: piecesHash, MetaHash: "", Peers: make(map[string]*Peer), PieceStatus: make(map[string]*Assignment)}
		}

		downloadExists := utils.CheckFolderExistsAndCreate(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), fileHash))

		allPiecesDownloaded := 0
		for index, hash := range doc.PiecesHash {
			done := false
			if downloadExists {
				done = utils.CheckFolderOrFileExists(fmt.Sprintf("%s/%s/%s", os.Getenv("DOWNLOAD_LOCATION"), fileHash, hash))
				if done {
					//this means file hash already downloaded
					allPiecesDownloaded++
				}
			}
			Downloads[fileHash].PieceStatus[hash] = &Assignment{Hash: hash, Done: done, Lock: "", Start: int64(index) * pieceSize}
		}
		if allPiecesDownloaded == len(doc.PiecesHash) {
			fmt.Println("Download already completed")
			return
		}
		Downloads[fileHash].StartDownloading(doc.PeersInfo)
	}
}

func GetFileChunks(p *Peer, d *Download) {
	// stream, err := p.FileServiceClient.GetPiece(context.Background())
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }
	for {
		//stream apen each time, as streaming file chunks on single stream has memory issues
		stream, err := p.FileServiceClient.GetPiece(context.Background())
		if err != nil {
			fmt.Println(err)
			return
		}
		work, ok := <-p.work
		if ok != true {
			fmt.Println("break.........")
			stream.CloseSend()
			break
		}

		p.Busy = true

		request := &filepb.FileChunkRequest{
			Start:     work.Start,
			FileHash:  d.FileHash,
			PieceSize: d.PieceSize,
		}
		// time.Sleep(1000 * time.Millisecond)
		go func() {
			//fmt.Println("send request")
			stream.Send(request)
		}()

		go func() {
			res, err := stream.Recv()
			
			if err == io.EOF || err != nil {
				log.Fatalf("Error while receiving: %v", err)
				fmt.Println(err)
				return
			}
			// pieceHash := d.PiecesHash[(res.GetStart() / 1024)]
			pieceHash := d.PiecesHash[(res.GetStart() / d.PieceSize)]
			fmt.Println("Received hash ", pieceHash, p.Key)
			//fmt.Printf("Received: %v\n", string(res.GetChunk()))
			pieceContent := bytes.Trim(res.GetChunk(), "\x00")

			isValidHash := utils.IsPieceHashValid(pieceContent, pieceHash)

			if isValidHash {
				file, err := os.Create(fmt.Sprintf("%s/%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileHash, pieceHash))
				if err != nil {
					log.Fatal(err)
				}
				_, err = file.Write(pieceContent)
				file.Close()
				if err == nil {
					work.Done = true
					work.Lock = ""
					p.Busy = false
					//go d.UpdateDownloadPercentage()
					isCompleted := d.CheckDownloadCompleted()
					if !isCompleted {
						d.GetNewAssignment(p.Key)
					}
				} else {
					fmt.Println(err)
				}
			} else {
				//discard downloaded piece and disconnect
				d.StopDownloadFromPeer(p.Key)
				d.PieceStatus[work.Hash].Done = false
				d.PieceStatus[work.Hash].Lock = ""
				d.AssignNewPeer(pieceHash)
			}
			//stream close each time, as streaming file chunks on single stream has memory issues
			stream.CloseSend()
		}()
	}
}
