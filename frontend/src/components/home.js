import axios from "axios"
import React, { Component } from "react";
import SearchFiles from './search_files'
import Downloads from './downloads'
import { message } from "antd";
import { socketEmitter } from "../utils/socket_util"

class Home extends Component {

	constructor(props) {
        super(props);

        this.state = {
            keyword: '',
            listData: [],
            listInfo: {
                total: 0,
                pageNumber: 1,
                pageSize: 1
            },
            downloads: [],
        }
	}

    componentDidMount = () => {
        this.getDownloads()
        //socketEmitter.on('refresh_downloads', this.getDownloads())
        socketEmitter().addListener('refresh_downloads', this.getDownloads)
    }

    componentWillUnmount = () => {
        socketEmitter().removeListener('refresh_downloads')
    }

    searchKeyword = async (keyword, pageNumber) => {
        let {listInfo} = this.state
        let updateSearch = {keyword, listData:[], listInfo:{
            total: 0,
            pageNumber: 1,
            pageSize: 1
        }}
        pageNumber = this.state.keyword !== keyword ? 1 : pageNumber
        
        let res = await axios.get(`/sync/searchFiles?keyword=${keyword}&pageSize=${listInfo.pageSize}&pageNumber=${pageNumber}`)
        if(res && res.data && res.data.result) {
            let listData = []
            let listInfo = JSON.parse(JSON.stringify(this.state.listInfo))
    
            let data = res.data
            listData = data.result.map((info) => {
                return {
                    peerId: info._source.appKey,
                    content: info._source.content,
                    fileName: info._source.filename,
                    type: info._source.meta.type,
                    size: info._source.meta.size,
                    fileHash: info._source.meta.fileHash,
                    piecesHash: info._source.meta.piecesHash
                }
            })

            if(data.total)
                listInfo.total =  data.total
            if(data.pageNumber )
                listInfo.pageNumber = data.pageNumber 
            if(data.pageSize)
                listInfo.pageSize = data.pageSize
            
            updateSearch.listData = listData
            updateSearch.listInfo = listInfo
        }
        this.setState(updateSearch)
    }
    
    downloadFile = async (fileInfo) => {
        let {fileHash, piecesHash, type, fileName} = fileInfo
        let res = await axios.post(`/sync/downloadFile`, {fileHash, piecesHash, type, fileName})

        if(res && res.data && res.data.success) {
            message.success(res.data.msg || "started")
            this.getDownloads()
        } 
        else if(res && res.data)
            message.error(res.data.msg)
    }

    getDownloads = async () => {
        let res = await axios.get(`/sync/getDownloads`)

        if(res && res.data && res.data.success && res.data.downloads) {
            this.setState({downloads: res.data.downloads})
        }
    }

    handleDownload = async (fileHash, start) => {
        await axios.put(`/sync/handleDownload`, {fileHash, start})
        this.getDownloads()
    }

    deleteDownload = async (_id, _rev, fileName, all=false) => {
        await axios.delete('/sync/deleteDownload', {data:{_id, _rev, fileName, all}})
        this.getDownloads()
    }

	render() {
        let {keyword, listData, downloads, listInfo} = this.state
		return (
            <div style={contentStyle}>
                <div style={filterStyle}>
                    <SearchFiles searchKeyword={this.searchKeyword} listData={listData} listInfo={listInfo} downloadFile={this.downloadFile}/>
                </div>
                <div style={downloadStyle}>
                    <Downloads downloads={downloads} handleDownload={this.handleDownload} deleteDownload={this.deleteDownload}/>
                </div>
            </div>
		);
	}
}

const filterStyle = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    width:"80%",
    height:"100%"
}

const downloadStyle = {
    display: "flex",
    flexDirection: "row",
    width:"20%",
    height: '500px',
    overflow: "auto"
}

const contentStyle = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "left",
    background: '#fff', 
    height: '100%'
}

export default Home;