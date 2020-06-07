package main

import (
	"os"

	"github.com/joho/godotenv"
	controllers "github.com/pramod/file_server/controllers"
)

func init() {
	godotenv.Load()
}

func main() {
	go func() {
		controllers.StartGrpcServer()
	}()
	go func() {
		// time.Sleep(3000 * time.Millisecond)
		downloadPath := os.Getenv("DOWNLOAD_LOCATION")
		if _, err := os.Stat(downloadPath); os.IsNotExist(err) {
			os.Mkdir(downloadPath, os.ModePerm)
		}
		controllers.WatchDownload()
	}()
	select {}
}
