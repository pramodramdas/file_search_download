package controllers

type Assignment struct {
	Hash  string
	Start int64
	Done  bool
	Lock  string // peerId ie. Key
	TTL   int64
}
