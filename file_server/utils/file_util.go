package utils

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"os"
)

func CheckFolderExistsAndCreate(path string) bool {
	_, err := os.Stat(path)
	downloadExists := true
	if err != nil {
		downloadExists = false
		os.Mkdir(path, os.ModePerm)
	}
	return downloadExists
}

func CheckFolderOrFileExists(path string) bool {
	_, err := os.Stat(path)
	downloadExists := true
	if err != nil {
		downloadExists = false
	}
	return downloadExists
}

func IsPieceHashValid(piece []byte, hash string) bool {
	// if hash == "66e155109cca615424b6f2b794fad8b8003fd251" && peerID == "aaa" {
	// 	fmt.Println("invalid ", hash)
	// 	return false
	// }
	h := sha1.New()
	h.Write(piece)
	if hash != hex.EncodeToString(h.Sum(nil)) {
		fmt.Println("invalid content hash mismatch ", hash)
		return false
	}
	return true
}

func DeleteFolder(folderPath string) {
	err := os.RemoveAll(folderPath)
	if err != nil {
		fmt.Println(err)
	}
}
