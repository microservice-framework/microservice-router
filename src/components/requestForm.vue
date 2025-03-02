<template>
  <div class="console clearfix pt-5">
    <div v-if="!endpoint">
      <div class="border-start border-5 border-danger ps-2">Select endpoint action</div>
    </div>
    <div v-if="endpoint">
      <div class="col-xs-12">
        <h3 class="text-secondary pb-2">
          <font-awesome-icon :icon="['fas', 'align-left']" />
          <span class="ms-2">Request</span>
        </h3>
        <div class="input-group mb-3">
          <input v-model="request.path" type="text" class="form-control" aria-label="endpoint path" placeholder="endpoint path" />
          <button
            class="action btn btn-secondary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            @click="toggle = !toggle"
          >
            {{ btnTitle }}
          </button>
          <ul
            class="dropdown-menu dropdown-menu-end"
            :class="{ show: toggle }"
            style="position: absolute; inset: 0px 0px auto auto; margin: 0px; transform: translate3d(0px, 40px, 0px)"
          >
            <li v-for="aMethod in availableMethods" :key="aMethod">
              <a class="dropdown-item" href="#" :class="{ active: isActive(aMethod) }" @click.prevent="setMethod(aMethod)">{{ aMethod }}</a>
            </li>
          </ul>
        </div>
        <div v-if="isShowToken" class="mb-3">
          <input id="formControlToken" v-model="request.token" type="text" class="form-control" placeholder=":TOKEN" />
        </div>
        <div v-if="['POST', 'PUT', 'SEARCH'].includes(selectedMethod)" class="mb-3">
          <label for="formControlData" class="form-label">JSON DATA</label>
          <textarea id="formControlData" v-model="request.query" type="text" class="form-control" placeholder=":JSON-DATA" rows="5"></textarea>
          <div v-if="inputErr" class="mt-2 mb-2">
            <div class="border-start border-5 border-danger ps-2">{{ inputErr }}</div>
          </div>
          <div class="json" style="display: none">{{ parsedInput }}</div>
        </div>

        <LoadingView v-if="isProcessing" />
        <button v-if="!isProcessing" type="submit" class="btn btn-success text-white" @click="sendRequest">Submit</button>
      </div>
      <div class="col-xs-12">
        <hr />
        <h3 class="text-secondary">
          <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
          <span class="ms-2">Answer</span>
          <span class="code ms-2" :class="codeClass"> {{ response.code }}</span>
        </h3>
        <div v-if="error" class="mt-2">
          <div class="border-start border-5 border-danger ps-2">{{ error }}</div>
        </div>
        <pre class="border rounded p-2">{{ response.answer }}</pre>
      </div>
    </div>
  </div>
</template>
<script>
import MicroserviceClient from '@microservice-framework/microservice-client';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAlignLeft } from '@fortawesome/free-solid-svg-icons';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

library.add(faAlignLeft);
library.add(faRightFromBracket);

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import LoadingView from './LoadingView.vue';

const parseProperty = function (property) {
  var returnValue = false;
  switch (property.type) {
    case 'number':
    case 'boolean':
    case 'string': {
      returnValue = '' + property.type.toUpperCase() + ': ';
      if (property.required) {
        returnValue = returnValue + '[required] ';
      }
      return returnValue + property.description;
      break;
    }
    case 'object': {
      returnValue = {};
      if (property.properties) {
        for (var name in property.properties) {
          var value = parseProperty(property.properties[name]);
          if (value !== false) {
            returnValue[name] = value;
          }
        }
        return returnValue;
      }
      if (property.required) {
        return returnValue;
      }
      return false;
    }
    case 'array': {
      returnValue = [];
      var item = parseProperty(property.items);
      if (item !== false) {
        returnValue.push(item);
      }
      return returnValue;
    }
  }
};

export default {
  components: {
    FontAwesomeIcon,
    LoadingView,
  },
  props: {
    endpoint: {
      type: [Object, Boolean],
      default: false,
    },
    method: {
      type: String,
      default: 'SEARCH',
    },
  },
  data: function () {
    return {
      request: {
        path: '',
        token: '',
        query: JSON.stringify({ query: {}, limit: 10, sort: {} }, null, 2),
      },
      error: '',
      inputErr: '',
      toggle: false,
      selectedMethod: false,
      isProcessing: false,
      response: '',
    };
  },
  computed: {
    codeClass: function () {
      return {
        'text-success': this.response.code == 200,
        'text-danger': this.response.code > 500,
        'text-info': this.response.code == 404,
      };
    },
    availableMethods: function () {
      if (!this.endpoint) {
        return [];
      }
      if (!this.endpoint.options) {
        return [];
      }
      if (!this.endpoint.options.methods) {
        return [];
      }
      let methods = [];
      for (let i in this.endpoint.options.methods) {
        methods.push(i);
      }
      return methods;
    },
    isShowToken: function () {
      return ['GET', 'DELETE', 'PUT'].includes(this.selectedMethod);
    },
    btnTitle: function () {
      if (this.selectedMethod) {
        return this.selectedMethod;
      }
      return 'Select method';
    },
    parsedInput: function () {
      let copy = this.request.query;
      this.inputErr = '';
      try {
        return JSON.parse(this.request.query);
      } catch (err) {
        this.inputErr = 'SyntaxError: ' + err.message;
      }
      return false;
    },
  },
  watch: {
    method: function (newValue) {
      this.selectedMethod = newValue;
    },
    selectedMethod: function (newMethod) {
      if (this.isIdMethod(newMethod)) {
        this.request.path = this.endpoint.path + '/:' + this.endpoint.options.id.title;
      } else {
        this.request.path = this.endpoint.path;
      }
      this.request.query = '{}';
      if (newMethod == 'PUT') {
        this.request.query = JSON.stringify({}, null, 2);
      }
      if (newMethod == 'POST') {
        this.updateQueryonPOST();
      }
      if (newMethod == 'SEARCH') {
        this.request.query = JSON.stringify({ query: {}, limit: 10, sort: {} }, null, 2);
      }
      console.log('selectedMethod', newMethod, this.request);
    },
    endpoint: {
      deep: true,
      handler: function (newValue) {
        if (newValue) {
          this.request.path = newValue.path;
          if (this.isIdMethod(this.selectedMethod)) {
            this.request.path = newValue.path + '/:' + newValue.options.id.title;
          }
          this.request.token = '';
          //this.request.query = "{query: {}, limit: 10, sort: {}}"
        }
        console.log('endpoint', this.selectedMethod, this.endpoint);
        if (this.selectedMethod == 'POST') {
          this.updateQueryonPOST();
        }
      },
    },
  },
  mounted: function () {
    if (this.method) {
      this.selectedMethod = this.method;
    }
  },
  methods: {
    updateQueryonPOST: function () {
      if (this.endpoint && this.endpoint.options && this.endpoint.options.properties) {
        let properties = JSON.parse(JSON.stringify(this.endpoint.options.properties));
        var postObject = {};
        for (var name in this.endpoint.options.properties) {
          if (name == 'created' || name == 'changed') {
            continue;
          }
          var property = parseProperty(properties[name]);
          if (property !== false) {
            postObject[name] = property;
          }
        }
        this.request.query = JSON.stringify(postObject, null, 2);
      } else {
        this.request.query = '{}';
      }
    },
    isIdMethod: function (method) {
      return ['GET', 'DELETE', 'PUT'].includes(method);
    },
    isActive: function (method) {
      if (this.selectedMethod == method) {
        return true;
      }
      return false;
    },
    setMethod: function (method) {
      this.selectedMethod = method;
      this.toggle = false;
    },
    sendRequest: async function () {
      this.isProcessing = true;
      this.error = '';

      let URL = window.location.protocol + '//' + window.location.host + '/';

      //compatibility with development
      if (window.DEVELOPMENT) {
        URL = 'http://127.0.0.1:8080/';
      }
      var client = new MicroserviceClient({
        URL: URL,
        secureKey: this.endpoint.secureKey,
      });
      console.log('client', client);
      let response = '';

      switch (this.selectedMethod) {
        case 'GET':
          response = await client.get(this.request.path, this.request.token);
          break;
        case 'DELETE':
          response = await client.delete(this.request.path, this.request.token);
          break;
        case 'PUT':
          response = await client.put(this.request.path, this.request.token, this.parsedInput);
          break;
        case 'POST':
          response = await client.post(this.request.path, this.parsedInput);
          break;
        case 'SEARCH':
          response = await client.search(this.request.path, this.parsedInput);
          break;
      }
      if (response.error) {
        this.error = response.error.message;
      }
      this.response = response;
      this.isProcessing = false;
    },
  },
};
</script>
<style lang="css" scoped>
.action {
  min-width: 100px;
}

.console {
  background-color: #fff;
  color: #444;
  padding: 10px 15px 30px;
  margin-left: -15px;
  margin-right: -15px;
  border-left: 1px solid #eee;
}

@media (min-width: 769px) {
  .console {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 50%;
    overflow: auto;
    margin: 0px;
  }
}
</style>
