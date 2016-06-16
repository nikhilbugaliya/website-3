import {
  LEAD_INIT,
  LEAD_RECEIVE,
  LEAD_SET_TAB,
  LEAD_INC_NOTIFY,
  LEAD_CLEAR_NOTIFY,
  LEAD_INC_LENGTH_LIST,
  LEAD_UPDATE,
  LEAD_CLOSE
} from '../mutation-types';
import { getLengthListOnBody } from '../getters/lead.js';

// initial state
const state = {
  done: false,
  seller: [],
  customer: [],
  tab: 'customer',
  notify_count: {},
  global_notify_count: 0,
  lengthList: 12
};

function checkUnreadMessage( items ) {
  for ( let i = items.length; i; i-- ) {
    const { chat, id } = items[ i - 1 ];
    if ( chat !== null ) {
      if ( chat.hasOwnProperty( 'unread_count' ) ) {
        state.notify_count[ id ] = chat.unread_count;
      } else {
        state.notify_count[ id ] = 0;
      }
    }
  }
}

// mutations
const mutations = {
  [LEAD_INIT]( state, { seller, customer, countUnread, lengthList } ) {
    state.seller              = seller;
    state.customer            = customer;
    state.done                = true;
    state.global_notify_count = countUnread;
    state.lengthList          = lengthList;
    checkUnreadMessage( seller );
    checkUnreadMessage( customer );
  },

  [LEAD_RECEIVE] ( state, leads, tab ) {

    if ( !state.hasOwnProperty( tab ) ) {
      console.error( `${LEAD_RECEIVE}: передан таб который не поддерживается : ${tab}`, state );
    }

    const matchedId = [];

    for ( let i = state[ tab ].length; i; i-- ) {

      for ( let j = leads.length; j; j-- ) {

        if ( state[ tab ][ i - 1 ].id === leads[ j - 1 ].id ) {

          state[ tab ].$set( i - 1, leads[ j - 1 ] );

          matchedId.push( leads[ j - 1 ].id );

        }

      }

    }

    if ( matchedId.length === 0 ) {

      checkUnreadMessage( leads );

      state[ tab ] = state[ tab ].concat( leads );

    } else if ( matchedId.length !== leads.length ) {

      const newLeads = [];

      for ( let i = leads.length; i; i-- ) {

        let isNew = true;

        for ( let j = matchedId.length; j; j-- ) {

          if ( matchedId[ i - 1 ] === leads[ i - 1 ].id ) {

            isNew = false;
            break;

          }

        }

        if ( isNew ) {
          newLeads.push( leads[ i - 1 ] );
        }

      }

      checkUnreadMessage( newLeads );

      state[ tab ] = state[ tab ].concat( newLeads );

    }

  },

  [LEAD_SET_TAB] ( state, tab = 'customer', lengthList = 12 ) {
    state.tab        = tab;
    state.lengthList = lengthList;
  },

  [LEAD_INC_LENGTH_LIST] ( state, lengthList = 6 ){
    state.lengthList += lengthList;
  },

  [LEAD_UPDATE] ( state, { conversation_id = null, members = null, parts = null, updated_at = null, status = null } ){

    if ( conversation_id !== null ) {

      if ( members !== null || parts !== null || updated_at !== null || status !== null ) {

        [ state.seller, state.customer ].forEach( ( leads, groupsIndex, groups ) => {

          leads.forEach( ( lead, index ) => {

            if ( lead.chat !== null ) {
              if ( conversation_id === lead.chat.id ) {

                if ( members !== null ) {
                  lead.chat.members = members;
                }
                if ( parts !== null ) {
                  lead.chat.recent_message.parts = parts;
                }
                if ( updated_at !== null ) {
                  lead.updated_at = updated_at;
                }
                if ( status !== null ) {
                  lead.status = status;
                }
                groups[ groupsIndex ].$set( index, lead );
              }

            }

          } );

        } );

      }

    }

  },

  [LEAD_INC_NOTIFY] ( state, lead_id ) {

    if ( lead_id !== null ) {

      if ( !state.notify_count.hasOwnProperty( lead_id ) ) {

        state.notify_count = Object.assign( {}, state.notify_count, { [ lead_id ]: 1 } );

      } else {

        state.notify_count = Object.assign( {}, state.notify_count, { [ lead_id ]: state.notify_count[ lead_id ] + 1 } );

      }

    }

    state.global_notify_count++;

  },
  [LEAD_CLEAR_NOTIFY] ( state, lead_id ) {

    if ( state.notify_count.hasOwnProperty( lead_id ) ) {

      const globalCount = state.global_notify_count - state.notify_count[ lead_id ];

      state.global_notify_count = globalCount >= 0 ? globalCount : 0;

    }

    state.notify_count = Object.assign( {}, state.notify_count, { [ lead_id ]: 0 } );

  },
  [LEAD_CLOSE] ( state ) {

    state.lengthList = getLengthListOnBody();

  }
};

export default {
  state,
  mutations
};
