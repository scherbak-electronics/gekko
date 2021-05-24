<template>
  <vue-slider v-model="value" @change="valueChange" :marks="marks" style="padding: 7px 26px;" direction="btt" :height="200"/>
</template>
 
<script>
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
 
export default {
  props: ['faderValue', 'faderLabel'],
  components: {
    VueSlider
  },
  data: function() {
    return {
    	value: this.faderValue,
      marks: [0, 20, 40, 60, 80, 100],
      options: {
        dotSize: 14,
        width: 'auto',
        height: 4,
        contained: false,
        direction: 'btt',
	      data: null,
        dataLabel: 'label',
        dataValue: 'value',
        min: 0,
        max: 100,
        //interval: 1,
        disabled: false,
        clickable: true,
        duration: 0.5,
        adsorb: false,
        lazy: false,
        tooltip: 'active',
        tooltipPlacement: 'top',
        tooltipFormatter: void 0,
        useKeyboard: false,
        keydownHook: null,
        dragOnClick: false,
        enableCross: true,
        fixed: false,
        minRange: void 0,
        maxRange: void 0,
        order: true,
        marks: [0, 20, 40, 60, 80, 100],
        dotOptions: void 0,
        dotAttrs: void 0,
        process: true,
        dotStyle: void 0,
        railStyle: void 0,
        processStyle: void 0,
        tooltipStyle: void 0,
        stepStyle: void 0,
        stepActiveStyle: void 0,
        labelStyle: void 0,
        labelActiveStyle: void 0,
      }
    } 
  },
  methods: {
      valueChange(value) {
        console.log(value);
        this.$emit('faderChange', value);
      }
    }
}
</script>