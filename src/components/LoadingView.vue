<template>
  <div class="loading d-flex align-items-center">
    <div class="spinner-grow spinner-grow-sm me-1 text-primary" role="status">
      <span class="visually-hidden">1</span>
    </div>
    <div class="spinner-grow spinner-grow-sm me-1 text-warning" role="status">
      <span class="visually-hidden">2</span>
    </div>
    <div class="spinner-grow spinner-grow-sm me-1 text-info" role="status">
      <span class="visually-hidden">3</span>
    </div>
    <span v-if="isInline" class="ps-2">{{ loadingText }}</span>
    <div v-if="!isInline" class="ps-2">{{ loadingText }}</div>
  </div>
</template>
<script>
export default {
  props: {
    labelPosition: { type: String, default: 'inline' },
    status: { type: String, default: '' },
  },
  // Properties returned from data() become reactive state
  // and will be exposed on `this`.
  data: function () {
    return {};
  },
  computed: {
    isInline: function () {
      return this.labelPosition === 'inline';
    },
    loadingText: function () {
      return '';
      if (this.status) {
        return this.status;
      }
      return this.$t('txt-loading', 'Loading');
    },
  },
  mounted: function () {},
};
</script>
<style lang="css" scoped>
.loading .spinner-grow-sm {
  --bs-spinner-height: 8px;
  --bs-spinner-width: 8px;
}
</style>
