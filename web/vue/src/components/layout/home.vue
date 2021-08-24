<template lang='pug'>
  section.contain.grd-row
    .grd-row-col-2-6(v-html='left')      
    .grd-row-col-1-6
      p place hold
    .grd-row-col-3-6.txt--center
      img(src='static/gekko.jpg')
      p
        em SEKO - Scherbak Electronics Gekko
    <div class="knob-param">
      <circle-slider v-model='sliderValue' knob-color="#000" progress-color="#000" circle-color="#cecece" :knob-radius="1" :progress-width="30" :circle-width="30" ></circle-slider>
      <h3>{{ sliderValue }}</h3>
    </div>
</template>

<script>
import Vue from 'vue'
import marked from '../../tools/marked';
//import fader from '../global/fader';
import VueCircleSlider from 'vue-circle-slider';
Vue.use(VueCircleSlider)

const left = marked(`

## SEKO

SEKO is a trading and backtesting platform that
connects to popular exchanges. It is written in javascript
and runs on nodejs.

[Find out more](https://gekko.wizb.it/).

`);

export default {
  data: function() {
    return {
      left: left,
      sliderValue: 1
    }
  },
  components: {
    // fader
    circleslider: VueCircleSlider.VueCircleSlider
  },
}
</script>
