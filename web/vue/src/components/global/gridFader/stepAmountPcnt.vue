<template>
  <vue-slider v-model="value" @change="valueChange" :tooltip='hover' :marks="marks" direction="btt" :height="150"/>
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
      marks: [0, 20, 40, 60, 80, 100],
    } 
  },
  methods: {
      valueChange(value) {
        this.$emit('changeStepAmountPcnt', value);
      }
    }
}
</script>