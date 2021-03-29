<template lang='pug'>
  section.contain.grd-row
    .grd-row-col-3-6(v-html='left')
    .grd-row-col-3-6.txt--center
      img(src='static/gekko.jpg')
      p
        em SEKO - Scherbak Electronics Gekko
</template>

<script>
import marked from '../../tools/marked';

const left = marked(`

## SEKO

SEKO is a trading and backtesting platform that
connects to popular exchanges. It is written in javascript
and runs on nodejs.

[Find out more](https://gekko.wizb.it/).

`);

export default {
  data: () => {
    return {
      left
    }
  }
}
</script>
