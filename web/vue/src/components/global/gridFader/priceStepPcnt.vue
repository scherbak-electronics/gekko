<template>
  <vue-slider v-model="value" @change="valueChange" :marks="marks" :tooltip='hover' :interval=0.1 :max=40 :min=0 direction="btt" :height="100"/>
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
      marks: [0, 5, 10, 15, 20, 25, 30, 35, 40]
    } 
  },
  methods: {
      valueChange(value) {
        this.$emit('changePriceStepPcnt', value);
      }
    }
}
</script>