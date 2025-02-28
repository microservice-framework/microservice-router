<template>
  <div class="body">
    <LoadingView v-if="!isOnline" />
    <div v-if="isOnline">
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" class="logo" alt="Vite logo" />
        </a>
        <a href="https://vuejs.org/" target="_blank">
          <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
        </a>
      </div>
      <LoginForm v-if="!$auth.isAuthorized" is-register-btn="true" />
      <div v-if="$auth.isAuthorized">
        <router-view></router-view>
      </div>
    </div>
  </div>
</template>
<script>
//import HelloWorld from './components/HelloWorld.vue';
import LoginForm from './components/Forms/LoginForm.vue';
import LoadingView from './components/Elements/LoadingView.vue';
import MicroserviceClient from '@microservice-framework/microservice-client';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

export default {
  components: {
    LoadingView,
    LoginForm,
  },
  data: function () {
    return {
      isDarkMode: false,
    };
  },
  computed: {
    isOnline: function () {
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
    applyTheme: function () {
      let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
    },
    logOut: function () {
      this.$auth.logOut();
    },
    initAuth: function () {
      var accessToken = getCookie('accessToken');
      if (accessToken) {
        this.checkAccessTokenOnINIT(accessToken);
        return;
      }
      if (this.$state.accessToken) {
        this.checkAccessTokenOnINIT(this.$state.accessToken);
        return;
      }
      this.loginAnonymous();
    },
    loginAnonymous: function () {
      // get anonymous access token
      var client = new MicroserviceClient({
        URL: this.$api.url,
        headers: { scope: 'auth' },
      });
      client.post('auth/user', { domain: 'default.domain' }).then((response) => {
        this.$debug.log('auth', response);
        if (response.error) {
          this.$debug.log('auth failed', response.error);
          return;
        }
        this.$auth.logIn(response.answer);
      });
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
          return this.loginAnonymous();
        }
        this.$auth.logIn(response.answer);
      });
    },
  },
};
</script>
