import { get } from '../../../tools/ajax'
import store from '../../'
import { bus } from '../../../components/global/ws'
import _ from 'lodash'

const init = () => {
  // SECO
  // this is AJAX request to get content
  get('devinfo', (err, resp) => {
    const devinfo = resp;
    store.commit('syncDevinfo', devinfo);
  });
}

const sync = () => {
  bus.$on('devinfo_new', data => store.commit('addDevinfo', data.state));
  bus.$on('devinfo_event', data => store.commit('updateDevinfo', data));
}

export default function() {
  init();
  sync();
}