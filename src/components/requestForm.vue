<template>
  <div class="console clearfix pt-5">
    <div v-if="!endpoint">
      <div class="border-start border-5 border-danger ps-2">Select endpoint action</div>
    </div>
    <div v-if="endpoint">
      <pre>{{ endpoint }}</pre>
      <div class="col-xs-12">
        <h3 class="text-secondary pb-2">
          <font-awesome-icon :icon="['fas', 'align-left']" />
          <span class="ms-2">Request</span>
        </h3>
        <div class="input-group mb-3">
          <input type="text" class="form-control" aria-label="endpoint path" placeholder="endpoint path" />
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
            <li><a class="dropdown-item" :class="{ active: isActive('POST') }" href="#" @click.prevent="setMethod('POST')">POST</a></li>
            <li><a class="dropdown-item" :class="{ active: isActive('GET') }" href="#" @click.prevent="setMethod('GET')">GET</a></li>
            <li><a class="dropdown-item" :class="{ active: isActive('PUT') }" href="#" @click.prevent="setMethod('PUT')">PUT</a></li>
            <li><a class="dropdown-item" :class="{ active: isActive('DELETE') }" href="#" @click.prevent="setMethod('DELETE')">DELETE</a></li>
            <li><a class="dropdown-item" :class="{ active: isActive('SEARCH') }" href="#" @click.prevent="setMethod('SEARCH')">SEARCH</a></li>
          </ul>
        </div>
        <div class="mb-3">
          <input id="formControlID" type="text" class="form-control" placeholder=":ID" />
        </div>
        <div class="mb-3">
          <input id="formControlToken" type="text" class="form-control" placeholder=":TOKEN" />
        </div>
        <div class="mb-3">
          <label for="formControlData" class="form-label">JSON DATA</label>
          <textarea id="formControlData" type="text" class="form-control" placeholder=":JSON-DATA" rows="15"></textarea>
        </div>

        <button type="submit" class="btn btn-success text-white">Submit</button>
      </div>
      <div class="col-xs-12">
        <hr />
        <h3 class="text-secondary">
          <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
          <span class="ms-2">Answer</span>
        </h3>
        <pre id="result">11</pre>
      </div>
    </div>
  </div>
</template>
<script>
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAlignLeft } from '@fortawesome/free-solid-svg-icons';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

library.add(faAlignLeft);
library.add(faRightFromBracket);

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  components: {
    FontAwesomeIcon,
  },
  props: {
    endpoint: {
      type: [Object, Boolean],
      default: false,
    },
  },
  data: function () {
    return {
      toggle: false,
      method: false,
    };
  },
  computed: {
    btnTitle: function () {
      if (this.method) {
        return this.method;
      }
      return 'Select method';
    },
  },
  methods: {
    isActive: function (method) {
      if (this.method == method) {
      }
    },
    setMethod: function (method) {
      this.method = method;
      this.toggle = false;
    },
  },
};
</script>
<style lang="css" scoped>
.action {
  min-width: 100px;
}
</style>
