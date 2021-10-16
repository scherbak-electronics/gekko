import Vue from 'vue'
import Vuex from 'vuex'

import syncImports from './modules/imports/sync'
import syncGekkos from './modules/gekkos/sync'
import syncNotifications from './modules/notifications/sync'
import syncConfig from './modules/config/sync'
import syncDevinfo from './modules/devinfo/sync'

export default function() {
  syncImports();
  syncGekkos();
  syncNotifications();
  syncConfig();
  syncDevinfo();
}