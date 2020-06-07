import React, { Component } from "react";
import { Input, List, Button, Modal, Pagination } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Search } = Input;

class SearchFiles extends Component {

	constructor(props) {
        super(props);
        this.kewordRef = React.createRef();
        this.state = {
            // keyword: this.props.keyword || '',
            listData: this.props.listData || [],
            listInfo: this.props.listInfo || {},
            filePreview: false,
            previewContent: ''
        }
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if(JSON.stringify(nextProps.listData) !== JSON.stringify(prevState.listData) || JSON.stringify(nextProps.listInfo) !== JSON.stringify(prevState.listInfo))
            return {listData: nextProps.listData, listInfo: nextProps.listInfo}
        else 
            return null
    }

    openFilePreview = (previewContent) => {
        //this.setState({previewContent, filePreview:true})
    }

    closeFilePreview = () => {
        //this.setState({filePreview: false});
    }

	render() {
        let {listData, previewContent, filePreview, listInfo} = this.state

		return (
            <div style={{width: "100%", height:"100%"}}>
                <Search
                    placeholder="search file"
                    enterButton="Search"
                    size="large"
                    onSearch={value => this.props.searchKeyword(value, listInfo.pageNumber)}
                    style={{width:"50%"}}
                    ref={this.kewordRef}
                />
                <Modal
                    title="Preview"
                    visible={filePreview}
                    onOk={this.closeFilePreview}
                    onCancel={this.closeFilePreview}
                >
                    <p>{previewContent}</p>
                </Modal>
                <List
                    itemLayout="vertical"
                    size="large"
                    bordered={true}
                    dataSource={listData}
                    renderItem={item => (
                        <List.Item
                            key={item.title}
                            actions={[<Button type="primary" onClick={() => this.props.downloadFile(item)} icon={<DownloadOutlined/>}>Download</Button>]}
                        >
                            <List.Item.Meta
                                title={<Button type="link" block onClick={() => this.openFilePreview(item.content)}>{item.fileName}</Button>}
                                description={`type: ${item.type} size: ${item.size} peerId: ${item.peerId}`}
                            />
                            {/* {item.content.substring(0, 100)} */}
                        </List.Item>
                    )}
                />
                <Pagination defaultCurrent={1} total={listInfo.total/listInfo.pageSize} onChange={(page, pageSize) => {this.props.searchKeyword(this.kewordRef.current.input.state.value, page)}} defaultPageSize={1}/>
            </div>
		);
	}
}

export default SearchFiles;