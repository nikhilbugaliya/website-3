import {
  CONVERSATION_SET,
  CONVERSATION_RECEIVE_MESSAGE,
  CONVERSATION_LOAD_MESSAGE,
  CONVERSATION_SET_SHOW_MENU,
  CONVERSATION_SET_SHOW_STATUS_MENU,
  CONVERSATION_AFTER_LOAD_IMG,
  CONVERSATION_CLOSE,
  LEAD_RECEIVE,
  LEAD_UPDATE,
  CONVERSATION_INC_LENGTH_LIST
} from '../mutation-types';
import * as messageService from 'services/message.js';
import * as leads from 'services/leads.js';
import * as chat from 'services/chat.js';
import {
  getId,
  isJoined,
  isMessages,
  isInit,
  getMessages,
  getLastMessageId,
  getCountRowOnBody
} from 'vuex/getters/chat.js';
import { getLeadById, getGroup } from 'vuex/getters/lead.js';
import { userID } from 'vuex/getters';

export const setConversation = ( { dispatch, state }, lead_id ) => {

  function chatJoin( lead_id, callBack ) {
    /**
     * Если пользователь не участник чата то его необходимо присоединить к чату.
     * */
    return chat
      .join( { lead_id } )
      .then( () => {
        return leads
          .get( { lead_id } )
          .then( ( { messages, lead, error } ) => {
            return callBack( { messages, lead, error } );
          } )
          .catch( ( error ) => {
            leads.sendError( error );
          } );

      } )
      .catch( ( error ) => {
        chat.sendError( error );
      } );

  }

  function run( messages = [], lead = {} ) {

    /**
     * Запучкает чат.
     * */

    if ( lead.chat ) {

      if ( lead.chat.id ) {

        const { chat:{ id:conversation_id } } = lead;

        if ( Array.isArray( messages ) ) {

          if ( messages.length > 0 ) {

            const msg = messages[ messages.length - 1 ];

            if ( state.leads.notify_count[ lead_id ] ) {

              messageService
                .update( conversation_id, msg.id )
                .catch( ( error ) => {
                  messageService.sendError( error, {
                    conversation_id,
                    messages,
                    lastMessageId: msg.id
                  } )
                } );

            }

          }

        }

        dispatch( CONVERSATION_SET, conversation_id, messages, getCountRowOnBody() );

      }

    }

  }

  const lead = getLeadById( state, lead_id );

  if ( lead !== null ) {

    /**
     * Переход состраницы списка чатов.
     * */

    if ( isJoined( state, lead ) ) {

      return new Promise( ( resolve, reject ) => {

        const { messages } = isMessages( state, lead );

        if ( messages === null ) {

          if ( lead.chat ) {

            if ( lead.chat.id ) {

              return messageService
                .find( lead.chat.id, null, getCountRowOnBody() )
                .then(
                  ( messages ) => {
                    if ( Array.isArray( messages ) ) {
                      run( messages, lead );
                    }
                    resolve();
                  } )
                .catch( ( error ) => {
                  messageService.sendError( error, state );
                  reject( error, state );
                } );

            }

          }

        } else {

          const { count, messages } = isMessages( state, lead );

          if ( isInit( state, lead ) ) {

            run( messages, lead );

            resolve();

          } else {

            const from_message_id = (messages === null) ? null : messages[ 0 ].id;
            const limit           = getCountRowOnBody() - count;

            return messageService
              .find( lead.chat.id, from_message_id, limit )
              .then(
                ( oldMessages ) => {
                  if ( Array.isArray( oldMessages ) ) {
                    run( oldMessages.concat( messages ), lead );
                  }
                  resolve();
                } )
              .catch( ( error ) => {
                messageService.sendError( error, state );
                reject( error, state );
              } );

          }

        }

      } );

    } else {

      return chatJoin( lead.id, ( { lead } ) => {

        if ( lead.chat ) {

          dispatch( LEAD_UPDATE, {
            conversation_id: lead.chat.id,
            members: lead.chat.members,
            updated_at: lead.chat.recent_message.created_at * 1e9
          } );

          return setConversation( { dispatch, state }, lead_id );

        }

      } );

    }

  } else {

    /**
     * Лиды инициализирутся отдельно, setConversation будет вызвана как только лиды инициализируются.
     * Прямой переход на страницу чата.
     * */

    return leads
      .get( { lead_id } )
      .then(
        ( { messages = [], lead, error } ) => {

          if ( error !== null ) {

            if ( error.code === 2 ) { // User in't a member it is mean that user need to join.

              return chatJoin( lead_id, ( { lead } ) => {

                dispatch( LEAD_RECEIVE, [ lead ], getGroup( state, lead ) );

                return setConversation( { dispatch, state }, lead_id );

              } );

            }

          } else {

            dispatch( LEAD_RECEIVE, [ lead ], getGroup( state, lead ) );

            if ( Array.isArray( messages ) ) {

              if ( messages.length < getCountRowOnBody() ) {

                const from_message_id = (messages.length > 0) ? messages[ 0 ].id : null;

                return messageService
                  .find( lead.chat.id, from_message_id, getCountRowOnBody() - messages.length )
                  .then(
                    ( newMessages = [] ) => {
                      if ( newMessages === null ) {
                        run( messages, lead );
                      } else {
                        run( newMessages.concat( messages ), lead );
                      }
                    } )
                  .catch( ( error ) => {
                    messageService.sendError( error, state );
                  } );

              } else {

                run( messages, lead );

              }

            } else {

              run( null, lead );

            }

          }

        } )
      .catch( ( error ) => {

        leads.sendError( error, state );
        return error;

      } );

  }

};

export const loadMessage = ( { dispatch, state } ) => {

  return new Promise( ( resolve, reject ) => {

    const messages = getMessages( state );
    const id       = state.conversation.id;

    if ( Array.isArray( messages ) ) {

      if ( messages.length <= state.conversation.lengthList ) {

        messageService
          .find( id, messages[ 0 ].id, 12 )
          .then(
            ( messages ) => {

              if ( Array.isArray( messages ) ) {

                dispatch( CONVERSATION_LOAD_MESSAGE, messages );
                dispatch( CONVERSATION_INC_LENGTH_LIST, messages.length );
                resolve();

              }

            },
            ( error ) => {

              messageService.sendError( error, state );
              reject();

            }
          );

      } else {

        dispatch( CONVERSATION_INC_LENGTH_LIST, 12 ); // Удлинняю список на 12 каждый раз если в памяти есть сообщения

        resolve();

      }

    } else {

      reject();

      console.error( '[ loadMessage ]: messages must be array' );

    }

  } );

};

export const createMessage = ( { dispatch, state }, conversation_id, text, mime_type ) => {

  return messageService
    .create( conversation_id, text, mime_type )
    .then( ( { chat, messages, error } ) => {

      dispatch( CONVERSATION_RECEIVE_MESSAGE, messages, conversation_id );

      // TODO Сделать сообщение помеченным как недоставленное на сервер.

    } )
    .catch( ( error ) => {

      messageService.sendError( error, state );

    } );

};

export const receiveMessage = ( { dispatch, state }, conversation_id, messages ) => {

  if ( Array.isArray( messages ) ) {

    if ( messages.length > 0 ) {

      const msg = messages[ messages.length - 1 ];

      if ( userID( state ) !== msg.user.user_id ) {

        dispatch( CONVERSATION_RECEIVE_MESSAGE, messages, conversation_id );

        if ( state.conversation.id === msg.conversation_id ) {

          if ( getLastMessageId( state ) !== msg.id ) {

            messageService
              .update( conversation_id, msg.id )
              .catch( messageService.sendError );

          }

        }

      }

    }

  }

};

export const addPreLoadMessage = ( { dispatch, state }, base64, base64WithPrefix, MIME, { width, height } ) => {

  const beforeLoadId = Math.random();

  const preLoadMessage = {
    beforeLoadId,
    loaded: false,
    conversation_id: getId( state ),
    created_at: Date.now(),
    user_id: userID( state ),
    user: {
      user_id: userID( state ),
    },
    parts: [
      {
        content: {
          link: base64WithPrefix,
          width,
          height
        },
        mime_type: 'image/base64',
      }
    ]
  };

  dispatch( CONVERSATION_RECEIVE_MESSAGE, [ preLoadMessage ] );

  messageService.create( getId( state ), base64, MIME ).then( ( { messages } ) => {

    dispatch( CONVERSATION_AFTER_LOAD_IMG, beforeLoadId, messages[ 0 ] );

  }, ( error ) => {

    console.log( error );

  } );

};

export const setStatus = ( { dispatch, state:{ conversation:{ lead:{ id } } } }, status ) => {

  return new Promise( ( resolve, reject ) => {

    leads.setEvent( id, status ).then( ( { status } ) => {

      resolve( status );

    } ).catch( error => {

      reject( error );

    } );

  } );

};

export const onMessages = ( { dispatch, state }, data ) => {

  if ( data.response_map ) {

    if ( data.response_map.chat && data.response_map.messages ) {

      const conversation_id = data.response_map.chat.id;
      const messages        = data.response_map.messages;

      if ( Array.isArray( messages ) ) {

        if ( messages.length > 0 ) {

          return receiveMessage( { dispatch, state }, conversation_id, messages );

        }

      }

    }

  }

  return null;

};

export const setShowMenu = ( { dispatch }, showMenu ) => {

  dispatch( CONVERSATION_SET_SHOW_MENU, showMenu );

};

export const setShowStatusMenu = ( { dispatch }, showStatusMenu ) => {

  dispatch( CONVERSATION_SET_SHOW_STATUS_MENU, showStatusMenu );

};

export const closeConversation = ( { dispatch } ) => {

  dispatch( CONVERSATION_CLOSE );

};
