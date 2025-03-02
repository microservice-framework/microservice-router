<template>
  <header>
    <span class="title">{{ package.name }} v:{{ package.version }}</span>
    <span v-if="isSecure" class="token secure">Secure key used</span>
    <span v-if="isAccessToken" class="token access"> Access Token </span>
  </header>
  <div class="body px-5">
    <div class="pt-5">{{ package.description }}</div>
    <div v-if="!isOnline" class="container">
      <div class="d-flex justify-content-center flex-column align-items-center">
        <div class="text-center lock">
          <font-awesome-icon :icon="['fas', 'lock']" />
        </div>
        <form class="row g-3" novalidate>
          <div class="mb-3 input-group">
            <input
              id="accessToken"
              v-model="accessKey"
              type="text"
              class="form-control"
              aria-describedby="accessTokenHelp"
              placeholder="Access Token"
            />
            <button id="button-addon2" class="btn btn-success text-white" type="submit" @click.prevent="checkSecureKey">Submit</button>
          </div>

          <div id="accessTokenHelp" class="form-text">Access Token or Secure KEY required to navigate API</div>
        </form>
        <div v-if="error" class="d-flex justify-content-center">
          <div class="border border-danger" style="width: 200px">
            <div class="text-bg-danger ps-2 pe-2 text-center" style="display: inline-block">
              <font-awesome-icon :icon="['fas', 'exclamation']" />
            </div>
            <span class="text-danger ps-2">{{ error }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isOnline" class="container-flex">
      <div class="row">
        <div class="col-xs-12 col-md-6">
          <div class="root">
            <EndpointList
              v-for="(endpoint, index) in endpoints"
              :key="index"
              :endpoint="endpoint"
              @options="(options) => setOptions(endpoint, options)"
              @selected="(method) => setEndpointMethod(endpoint, method)"
            />
          </div>
        </div>
        <div class="col-xs-12 col-md-6">
          <requestForm :endpoint="isEndpoint" :method="isMethod" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import MicroserviceClient from '@microservice-framework/microservice-client';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';
import { faLock } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamation);
library.add(faLock);

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import requestForm from './components/requestForm.vue';
import EndpointList from './components/EndpointList.vue';

export default {
  components: {
    FontAwesomeIcon,
    requestForm,
    EndpointList,
  },
  data: function () {
    return {
      isEndpoint: false,
      isMethod: 'SEARCH',
      toggle: false,
      error: '',
      isSecure: false,
      isAccessToken: false,
      routes: false,
      accessKey: '',
      isDarkMode: false,
    };
  },
  computed: {
    endpoints: function () {
      let endpoints = [];
      let foundPath = [];
      for (let endpoint of this.routes) {
        for (let path of endpoint.path) {
          if (!foundPath.includes(path)) {
            foundPath.push(path);
            endpoints.push({
              path: path,
              scope: endpoint.scope,
              changed: endpoint.changed,
              metrics: endpoint.metrics,
              secureKey: endpoint.secureKey,
            });
          }
        }
      }
      return endpoints;
    },
    package: function () {
      return window.package;
    },
    isOnline: function () {
      if (this.isSecure) {
        return true;
      }
      return this.$api.online;
    },
  },
  mounted() {
    console.log('hasg', window.location.hash);
    if (window.location.hash) {
      this.accessKey = window.location.hash.substring(1);
      this.checkSecureKey();
    }
    this.initAuth();
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.applyTheme();
    });
    this.applyTheme();
  },
  methods: {
    setEndpointMethod: function (endpoint, method) {
      this.isEndpoint = endpoint;
      this.isMethod = method;
    },
    setOptions: function (endpoint, options) {
      endpoint.options = options;
    },
    checkSecureKey: async function () {
      window.location.hash = this.accessKey;
      this.error = '';

      let URL = window.location.protocol + '//' + window.location.host + '/';

      //compatibility with development
      if (window.DEVELOPMENT) {
        URL = 'http://127.0.0.1:8080/';
      }

      var client = new MicroserviceClient({
        URL: URL,
        secureKey: this.accessKey,
      });
      let response = await client.search('register', { type: 'handler' });
      if (response.error) {
        this.error = response.error.message;
      }
      if (response.code == 403) {
        this.error = 'Access Denied';
        return;
      }
      if (response.code == 404) {
        this.error = 'Register is not available';
        return;
      }
      this.isSecure = true;
      this.routes = response.answer;
      this.$debug.log('checkSecureKey', response);
    },
    applyTheme: function () {
      let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
    },
    logOut: function () {
      this.$auth.logOut();
    },
    initAuth: function () {
      var accessToken = window.location.search.substring(1);
      if (accessToken) {
        this.checkAccessTokenOnINIT(accessToken);
        return;
      }
    },
    checkAccessTokenOnINIT: function (accessToken) {
      this.$debug.log('checkAccessTokenOnINIT', accessToken);
      var client = new MicroserviceClient({
        URL: this.$api.url,
        accessToken: accessToken,
        headers: { scope: 'auth' },
      });
      client.get('auth/' + accessToken).then((response) => {
        this.$debug.log('auth', accessToken, response);
        if (response.error) {
          this.$debug.log('auth failed', response.error);
        }
      });
    },
  },
};
</script>
<style lang="css" scoped>
.body {
  font-family: 'Roboto Mono', monospace;
  /*font-family: 'Monaco', monospace;*/
  /*font-family: 'Courier New', monospace;*/
  /*font-weight: 300;*/
  /*font-size: 14px;*/
}
.lock {
  font-size: 100px;
  margin-top: 25vh;
}

header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  width: 100%;
}
header span.title {
  background-color: #444;
  font-weight: bold;
  color: white;
  padding: 5px 10px;
  border-bottom-right-radius: 5px;
}

header .token {
  float: right;
  font-weight: bold;
  padding: 2px 10px;
  border-bottom-left-radius: 5px;
}

header .token.secure {
  background-color: #e6360f;
  color: white;
}

header .token.access {
  background-color: #1094e6;
  color: white;
}

.root {
  position: relative;
  padding: 2em 0;
  margin-top: 2em;
  margin-bottom: 2em;
  border-bottom: 1px solid #ccc;
}
.root::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  height: 100%;
  width: 2px;
  background: #d7e4ed;
}
</style>
