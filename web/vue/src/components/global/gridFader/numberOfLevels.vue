<template>
  <vue-slider v-model="value" @change="valueChange" :tooltip='hover' :marks="marks" :max=30 :min=0 direction="btt" :height="100"/>
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
      marks: [0, 5, 10, 15, 20, 25, 30]
    } 
  },
  methods: {
      valueChange(value) {
        this.value = value;
        this.$emit('changeNumberOfLevels', value);
      }
    }
}
</script>