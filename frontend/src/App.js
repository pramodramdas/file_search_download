import React, { Component } from 'react';
import { Switch, Route, Prompt } from 'react-router-dom';
import Home from './components/home'
import { init_socket_client } from './utils/socket_util'
// import { Layout, Menu, Button } from 'antd';

import './App.css';
import "../node_modules/antd/dist/antd.css";

class App extends Component {
	constructor() {
		super();
		this.state = {
		}
	}

	componentDidMount() {
		init_socket_client()
	}

	render() {

		return (
			<div className="App">
			<Switch>
				<Route exact path="/" component={Home} />
				<Route exact path="/home" component={Home} />
			</Switch>
			</div>
		);
	}
}

export default App;
