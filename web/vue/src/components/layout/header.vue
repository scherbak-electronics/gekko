<template lang='pug'>
  div
    nav.bg--light-gray
      .menu.contain
        router-link(to='/home').py1 Home
        router-link(to='/live-gekkos').py1 Trading
        router-link(to='/backtest').py1 Backtest
        router-link(to='/data').py1 Import
        router-link(to='/config').py1 Config
        a(href='https://gekko.wizb.it/docs/introduction/about_gekko.html', target='_blank').py1 Documentation
</template>

<script>
export default {}
</script>

<style>
.menu {
  display: flex;
  flex-direction: row;
  margin-top: 0;
  margin-bottom:0;
}

.menu a {
  flex: 1 1 100%;
  display: block;
  text-align: center;
  text-decoration: none;
  color: inherit;
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;
}

.menu .router-link-active {
  background-color: rgba(250,250,250,.99);
}

.menu a:hover {
  text-decoration: underline;
}

</style>
