package controllers

import (
	"fmt"
	"io/ioutil"
	"os"
	"time"

	utils "github.com/pramod/file_server/utils"
)

type Download struct {
	ID         string
	Rev        string
	FileHash   string
	FileName   string
	PiecesHash []string
	PieceSize  int64
	MetaHash   string
	//Key(peerId) = Peer info
	Peers map[string]*Peer
	//piecehash = assignment
	PieceStatus map[string]*Assignment
	Start       bool
	//mux         sync.Mutex
}

func (d *Download) InitPeers(pi []PeersInfo) {
	for _, p := range pi {
		d.Peers[p.PeerID] = &Peer{Key: p.PeerID, Address: p.Address, Up: false, HasFile: false, work: make(chan *Assignment)}
	}
}

func (d *Download) StartAssiging() {
	var freePeers []string
	for k, _ := range d.Peers {
		if d.Peers[k].HasFile && !d.Peers[k].Busy && d.Peers[k].Up {
			freePeers = append(freePeers, k)
		}
	}

	for _, hash := range d.PiecesHash {
		a := d.PieceStatus[hash]
		if !a.Done && a.Lock == "" {
			if len(freePeers) > 0 {
				// fmt.Println("Hi ", index, hash)
				//a.Start = int64(index * 1024)
				a.TTL = time.Now().Unix() + 5000
				a.Lock = d.Peers[freePeers[len(freePeers)-1]].Key
				d.Peers[freePeers[len(freePeers)-1]].work <- a // assign work to last peer
				freePeers = freePeers[:len(freePeers)-1]       // remove at end
				time.Sleep(10 * time.Millisecond)
			}
		}
	}
}

func (d *Download) GetNewAssignment(peerID string) {
	for _, hash := range d.PiecesHash {
		a := d.PieceStatus[hash]
		if !a.Done && a.Lock == "" {
			//a.Start = int64(index * 1024)
			a.Lock = d.Peers[peerID].Key
			a.TTL = time.Now().Unix() + 5000
			d.Peers[peerID].work <- a
		}
	}
}

func (d *Download) AssignNewPeer(pieceHash string) {
	for k, _ := range d.Peers {
		if d.Peers[k].HasFile && !d.Peers[k].Busy && d.Peers[k].Up {
			a := d.PieceStatus[pieceHash]
			if !a.Done && a.Lock == "" {
				a.Lock = d.Peers[k].Key
				a.TTL = time.Now().Unix() + 5000
				d.Peers[k].work <- a
			}
		}
	}
}

func (d *Download) CreateDownloadFile() error {
	_, err := os.Stat(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileName))
	if err != nil {
		file, err := os.Create(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileName))
		if err != nil {
			return err
		}
		defer utils.DeleteFolder(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileHash))
		defer file.Close()
		_, err = os.Stat(fmt.Sprintf("%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileHash))
		if err != nil {
			return err
		}
		for _, hash := range d.PiecesHash {
			data, err := ioutil.ReadFile(fmt.Sprintf("%s/%s/%s", os.Getenv("DOWNLOAD_LOCATION"), d.FileHash, hash))
			if _, err = file.WriteString(string(data)); err != nil {
				return err
			}
		}
	}
	return nil
}

func (d *Download) StopDownloadFromPeer(peerID string) {
	close(d.Peers[peerID].work)
	d.Peers[peerID].work = nil
	d.Peers[peerID].Busy = false
	d.Peers[peerID].Up = false
	d.Peers[peerID].Conn.Close()
}

func (d *Download) StopDownload() {
	for k, _ := range d.Peers {
		if d.Peers[k].work != nil {
			close(d.Peers[k].work)
			d.Peers[k].work = nil
			d.Peers[k].Busy = false
			d.Peers[k].Conn.Close()
			//fmt.Println("After close GetState", d.Peers[k].Conn.GetState())
		}
	}

	d.Start = false
	utils.UpdateDoc(
		"downloads",
		d.ID,
		map[string]interface{}{
			//"_rev":  d.Rev,
			"start": false,
		},
	)
}

func (d *Download) CheckDownloadCompleted() bool {
	for _, a := range d.PieceStatus {
		if a.Done != true {
			return false
		}
	}

	//combine all pieces and create file
	d.CreateDownloadFile()
	fmt.Println("Yes download complete")
	utils.UpdateDoc(
		"downloads",
		d.ID,
		map[string]interface{}{
			//"_rev": d.Rev,
			"done": true,
		},
	)
	d.StopDownload()
	return true
}

func (d *Download) StartDownloading(pi []PeersInfo) {
	//get peer and update peers
	d.InitPeers(pi)
	for k, _ := range d.Peers {
		err := d.Peers[k].GetConnection()
		if err != nil {
			fmt.Println(err)
			continue
		}
		d.Peers[k].Up = true
		//loop all Peers and check if they have fileHash
		d.Peers[k].CheckFileHash(d.FileHash)
		if d.Peers[k].HasFile {
			go func() {
				GetFileChunks(d.Peers[k], d)
			}()
		}
		time.Sleep(10 * time.Millisecond)
	}
	//time.Sleep(100 * time.Millisecond)
	d.StartAssiging()
	d.Start = true
	fmt.Println("download started")
}
