<template>
  <header>
    <span class="title">{{ package.name }} v:{{ package.version }}</span>
    <span v-if="isSecure" class="token secure">Secure key used</span>
    <span v-if="isAccessToken" class="token access"> Access Token - Expire in: {{ expireIn }}</span>
  </header>
  <div class="body px-5">
    <div class="pt-5">{{ package.description }}</div>
    <div v-if="!isOnline" class="container">
      <div class="d-flex justify-content-center flex-column align-items-center">
        <div class="text-center lock">
          <font-awesome-icon :icon="['fas', 'lock']" />
        </div>
        <div v-if="error" class="d-flex justify-content-center pb-3">
          <div class="border border-danger" style="width: 200px">
            <div class="text-bg-danger ps-2 pe-2 text-center" style="display: inline-block">
              <font-awesome-icon :icon="['fas', 'exclamation']" />
            </div>
            <span class="text-danger ps-2 text-center">{{ error }}</span>
          </div>
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
      </div>
    </div>
    <div v-if="isOnline" class="container-flex">
      <div class="row">
        <div class="col-xs-12 col-md-6">
          <div class="root">
            <div class="search pb-4 input-group">
              <span id="basic-addon1" class="input-group-text"><font-awesome-icon :icon="['fas', 'magnifying-glass']" /></span>
              <input v-model="filter" type="text" class="form-control" placeholder="Filter" />
            </div>
            <EndpointList
              v-for="(endpoint, index) in endpoints"
              :key="index + endpoint.path"
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
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamation);
library.add(faLock);
library.add(faMagnifyingGlass);

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
      filter: '',
      isEndpoint: false,
      isMethod: 'SEARCH',
      toggle: false,
      error: '',
      isSecure: false,
      isAccessToken: false,
      routes: false,
      accessKey: '',
      isDarkMode: false,
      isAccessKeyDenied: false,
    };
  },
  computed: {
    expireIn: function () {
      let expireIn = false;

      if (this.isAccessToken.expireAt !== -1) {
        let expireInsec = Math.round((this.isAccessToken.expireAt - Date.now()) / 1000);
        expireIn = '';
        if (expireInsec > 3600) {
          expireIn = expireIn + Math.floor(expireInsec / 3600) + ' hours ';
          expireInsec = expireInsec - Math.floor(expireInsec / 3600) * 3600;
        }
        if (expireInsec > 60) {
          expireIn = expireIn + Math.floor(expireInsec / 60) + ' min ';
          expireInsec = expireInsec - Math.floor(expireInsec / 60) * 60;
        }
        if (expireInsec > 0) {
          expireIn = expireIn + Math.round(expireInsec) + ' sec ';
        }
      }
      return expireIn;
    },
    endpoints: function () {
      let endpoints = [];
      let foundPath = [];
      if (!this.routes) {
        return endpoints;
      }
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
      // sorting
      endpoints.sort((a, b) => {
        return a.path.localeCompare(b.path);
      });
      if (this.filter) {
        return endpoints.filter((a) => {
          if (a.path.match(this.filter) !== null) {
            return true;
          }
          return false;
        });
      }
      return endpoints;
    },
    package: function () {
      return window.package;
    },
    isOnline: function () {
      if (this.isAccessKeyDenied) {
        return false;
      }
      if (this.isSecure) {
        return true;
      }
      if (this.$api.online) {
        return true;
      }
      return this.$api.online;
    },
  },
  watch: {
    '$api.online': async function (isOnline) {
      if (isOnline) {
        let response = await this.$api.client.search('register', { type: 'handler' });
        if (response.error) {
          this.error = response.error.message;
        }
        if (response.code == 403) {
          this.error = 'Access Denied';
          this.isAccessKeyDenied = true;
          return;
        }
        if (response.code == 404) {
          this.error = 'Register is not available';
          return;
        }
        this.routes = response.answer;
      }
    },
  },
  mounted() {
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
        this.initAuth();
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
      let accessToken = this.accessKey;
      if (accessToken) {
        this.checkAccessTokenOnINIT(accessToken);
        return;
      }
    },
    checkAccessTokenOnINIT: function (accessToken) {
      this.$debug.log('checkAccessTokenOnINIT', accessToken);
      let URL = window.location.protocol + '//' + window.location.host + '/';

      //compatibility with development
      if (window.DEVELOPMENT) {
        URL = 'http://127.0.0.1:8080/';
      }
      var client = new MicroserviceClient({
        URL: URL,
        accessToken: accessToken,
        headers: { scope: 'auth' },
      });
      client.get('auth/' + accessToken).then((response) => {
        this.$debug.log('auth', accessToken, response);
        if (response.error) {
          this.$debug.log('auth failed', response.error);
          this.error = response.error;
          return;
        }
        this.error = '';
        this.isAccessToken = response.answer;
        this.$api.url = URL;
        this.$api.setAccessToken(response.answer);
      });
    },
  },
};
</script>
<style lang="css" scoped>
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
