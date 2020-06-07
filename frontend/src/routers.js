import React from 'react';
import { Route, Router, BrowserRouter } from 'react-router-dom';
import App from './App';
import history from "./utils/history";
import axios from 'axios'


axios.interceptors.response.use(response => {
        return response;
    }, error => {
        if (error.response.status === 401) {
            if(error.response.data && error.response.data.Msg)
                //message.error(error.response.data.Msg)
                return error.response;
        }
        return error;
    }
);

const Routes = () => {
    return (
        <Router history={history}>
            <Route path="/" component={App}/>
        </Router>
    );
};

export default Routes;