<template>
  <div class="body">
    ffff
    {{ routes }}
    <div v-if="!isOnline" class="container">
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
</template>
<script>
import MicroserviceClient from '@microservice-framework/microservice-client';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';
import { faLock } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamation);
library.add(faLock);

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  components: {
    FontAwesomeIcon,
  },
  data: function () {
    return {
      error: '',
      isSecure: false,
      routes: false,
      accessKey: '',
      isDarkMode: false,
    };
  },
  computed: {
    isOnline: function () {
      if(this.isSecure) {
        return true
      }
      return this.$api.online;
    },
  },
  mounted() {
    this.initAuth();
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.applyTheme();
    });
    this.applyTheme();
  },
  methods: {
    checkSecureKey: async function () {
      this.error = '';
      var client = new MicroserviceClient({
        URL: 'http://127.0.0.1:8080/',
        secureKey: this.accessKey,
      });
      let response = await client.search('register', {});
      if (response.error) {
        this.error = response.error.message;
      }
      if (response.code == 403) {
        this.error = 'Access Denied';
        return
      }
      if (response.code == 404) {
        this.error = 'Register is not available';
        return
      }
      this.isSecure = true;
      this.routes = response.answer
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
.lock {
  font-size: 100px;
}
</style>
