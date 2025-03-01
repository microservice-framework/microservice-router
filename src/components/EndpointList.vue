<template>
  <div class="row path">
    <div class="col-xs-12">
      <span class="title">
        <font-awesome-icon :icon="['far', 'circle']" /> /{{ endpoint.path }}
        <span v-if="options" class="label label-default version"> v: {{ options.version }} </span>
        <span class="label label-default scope"> scope: {{ endpoint.scope }} </span>
      </span>
      <p class="description">
        {{ options.description }}
      </p>
    </div>
    <div v-if="error">
      <div class="border-start border-5 border-danger ps-2">{{ error }}</div>
    </div>
    <div v-if="options.methods">
      <template v-for="(method, index) in options.methods" :key="index">
        <div class="col-xs-12 method" :class="'method-' + index">
          <span class="title">
            <font-awesome-icon :icon="['fas', 'minus']" />
            <font-awesome-icon :icon="['fas', 'minus']" />
            <span class="operation">
              <a href class="action" @click.prevent="selectedMethod(index)">
                {{ index }} <span v-if="isIdMethod(index)">/:{{ options.id.title }} </span></a
              >
            </span>
          </span>
          <p class="description">{{ method.description }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
<script>
import MicroserviceClient from '@microservice-framework/microservice-client';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faMinus } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
library.add(faMinus);
library.add(faCircle);

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  components: {
    FontAwesomeIcon,
  },
  props: {
    endpoint: {
      type: [Boolean, Object],
      default: false,
    },
  },
  emits: ['options', 'selected'],
  data: function () {
    return {
      error: false,
      options: false,
    };
  },
  mounted: function () {
    if (this.endpoint.options) {
      this.options = his.endpoint.options;
    }
    this.getOptions();
  },
  methods: {
    isIdMethod: function (method) {
      return ['GET', 'DELETE', 'PUT'].includes(method);
    },
    selectedMethod: function (method) {
      this.$emit('selected', method);
    },
    getOptions: async function () {
      var client = new MicroserviceClient({
        URL: 'http://127.0.0.1:8080/',
        secureKey: this.endpoint.secureKey,
      });

      let response = await client.options(this.endpoint.path, {});
      this.$debug.log('getOptions', response);
      if (response.error) {
        this.error = response.error.message;
      }
      this.options = response.answer;
      this.$emit('options', this.options);
    },
  },
};
</script>
<style lang="css" scoped>
.action {
  text-decoration: none;
  color: #444;
}
.action:hover {
  text-decoration: underline;
}
.path {
  padding-bottom: 25px;
}
.path .title {
  padding: 5px;
  padding-left: 11px;
  background-color: white;
  font-weight: bold;
  z-index: 1000;
  position: relative;
}

.path .title svg {
  color: #ddd;
  padding-right: 5px;
}

.path:hover .title svg {
  color: #444;
}

.path .title .label {
  padding: 0.2em 0.6em 0.3em;
  font-size: 75%;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25em;
  background: #eee;
  color: #444;
  float: right;
  margin: 0px 5px;
  display: inline;
}

.path .title .label.version {
  background: #54b523;
  color: white;
}

.path .title .label.scope {
  background: #444;
  color: white;
}

.path .description {
  padding-left: 35px;
  color: #ddd;
}

.method-GET .description {
  color: #3c8ce7;
}
.method-POST .description {
  color: #3ce870;
}

.method-PUT .description {
  color: #e8ce3c;
}

.method-DELETE .description {
  color: #e8563c;
}

.method-SEARCH .description {
  color: #ac3ce8;
}

.method .title {
  background-color: transparent;
  padding-left: 18px;
  color: #444;
  font-weight: 300;
}
.method .title .opeartion {
  background: black;
  padding: 5px;
  color: white;
}

.method .title .fa {
  color: #d7e4ed;
  padding-right: 5px;
  font-size: 75%;
}

.method .description {
  padding-left: 53px;
}
</style>
