import store from 'vuex/store';
import Store from './store';
import Model from './model';
import Controller from './controller';

const error_codes = {
  emerg: 0,
  alert: 1,
  crit: 2,
  err: 3,
  warn: 4,
  notice: 5,
  info: 6,
  "service/debug": 7
};

const Private = new WeakMap();

class Channel {
  constructor() {

    const store      = new Store();
    const model      = new Model( store );
    const controller = new Controller( model, store );

    Private.set( this, { model, controller } );

    this.req = this.req.bind( this );
    this.on  = this.on.bind( this );
    this.off = this.off.bind( this );

  }

  req( action_str, data_type, request_map = {}, trans_map = {} ) {
    const { model } = Private.get( this );
    if ( store.state.user.isAuth ) {
      trans_map.token = store.state.user.token;
    }
    return new Promise( ( resolve, reject ) => {
        model.request(
          action_str,
          data_type,
          [],
          request_map,
          trans_map,
          function( data ) {
            // ToDo: update if after refactoring protocol
            if ( !data.log_list[ 0 ] ) {
              alert( "Please return log_list with 1 log" );
            }
            data.log_map = data.log_list[ 0 ];
            if ( data.log_map.level_int === error_codes.err ) {
              reject( data );
            } else {
              resolve( data );
            }
          }
        );
      }
    );
  }
  on( action_str, data_type, handler_func ) {
    Private.get( this ).controller.addRoute( action_str, data_type, handler_func );
  }
  off( action_str, data_type, handler_func ) {
    Private.get( this ).controller.removeRoute( action_str, data_type, handler_func );
  }
}

export default (function init() {
  return new Channel();
})();
