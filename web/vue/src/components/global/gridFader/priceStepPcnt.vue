<template>
  <vue-slider v-model="value" @change="valueChange" :marks="marks" :tooltip='hover' :interval=0.01 :max=10 :min=0 direction="btt" :height="150"/>
</template>
 
<script>
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
 
export default {
  model: {
    prop: 'value',
    event: 'change'
  },
  props: {
    value: Number
  },
  components: {
    VueSlider
  },
  data: function() {
    return {
    	value: this.value,
      marks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    } 
  },
  methods: {
      valueChange(value) {
        this.$emit('changePriceStepPcnt', value);
      }
    }
}
</script>