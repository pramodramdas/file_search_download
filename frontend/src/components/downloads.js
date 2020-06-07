import React, { Component } from "react";
import { List, Button } from 'antd';

class Downloads extends Component {

	constructor(props) {
        super(props);

        this.state = {
            downloads: this.props.downloads || []
        }
	}

    static getDerivedStateFromProps(nextProps, prevState) {
        if(JSON.stringify(nextProps.downloads) !== JSON.stringify(prevState.downloads))
            return {downloads: nextProps.downloads}
        else 
            return null
    }

	render() {
		return (
            <div>
                <List
                    itemLayout="horizontal"
                    dataSource={this.state.downloads}
                    renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            title={item.fileName}
                            description={`type: ${item.type} createdOn: ${new Date(item.createdOn)}`}
                        />
                        {   !item.done ?
                            <Button type="primary" onClick={() => this.props.handleDownload(item.fileHash, !item.start)}>{item.start ? "Stop" : "Start"}</Button> :
                            <Button type="primary" onClick={() => this.props.deleteDownload(item._id, item._rev, item.fileName, true)}>{"Remove full download"}</Button>
                        }
                        {
                            !item.start ? 
                            <Button type="primary" onClick={() => this.props.deleteDownload(item._id, item._rev, item.fileName)}>{"Remove download"}</Button> :
                            null
                        }
                        {   item.peersInfo.length == 0 ? "No Peers online": null}
                    </List.Item>
                    )}
                />
            </div>
		);
	}
}

export default Downloads;