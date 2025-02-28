import { createApp } from 'vue';
import Debug from '@gormartsen/vue-debug';

//import './style.css'
//import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap CSS
import './assets/main.scss';

import App from './App.vue';

const APP = createApp(App);

APP.use(Debug, window.DEBUG ? window.DEBUG : true);

// API this.$api global variable
import ApiClient from '@microservice-framework/vue-api-client';
import apiSettings from './settings/api';
APP.use(ApiClient, apiSettings);

APP.mount('#app');

window.APP = APP;
