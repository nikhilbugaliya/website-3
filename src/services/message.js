import channel from "services/channel/channel.js";

export const ERROR_CODES = {
    NOT_EXISTS: 1,
    FORBIDDEN: 2,

    // Local
    UNATHORIZED: 10
};


/**
 * History messages of chat
 * @param  {number} product_id
 *
 * RESOLVE
 * [
 *   {
 *     "conversation_id": 1,
 *     "user_id": 1379,
 *     "parts": [
 *       {
 *         "content": "Товар в наличии?",
 *         "mime_type": "text/plain"
 *       }
 *     ],
 *     "user": {
 *        "id": 6,
 *        "user_id": 1379,
 *        "name": "happierall"
 *      }
 *     "created_at": 1460910536,
 *     "id": 2
 *   },
 * ]
 *
 * REJECT (one of ERROR_CODES) {NOT_EXISTS, UNATHORIZED}
 */

export function find({ conversation_id, from_message_id, limit }) {

  return new Promise( (resolve, reject) => {

    channel.req("search", "message", { conversation_id, from_message_id, limit })
    .then( data => {
      if (!data.response_map.error) {
        resolve(data.response_map.messages);
      } else if (data.response_map.error.code === ERROR_CODES.FORBIDDEN) {
        reject(data.response_map.error);
      }
    }).catch( error => {
      if (error.log_map.code_key === '403') {
        reject(ERROR_CODES.UNATHORIZED);
      }
    });

  });
}


/**
 * Send message to chat
 * @login_required
 * @param {number} conversation_id *
 * @param {string} text *
 * @param {string} mime_type default: text/plain
 *
 * RESOLVE
 * {
 *   "chat": {
 *     "id": 5,
 *     "members": [
 *       {
 *         "id": 8,
 *         "user_id": 1379,
 *         "name": "happierall"
 *       },
 *       {
 *         "id": 9,
 *         "user_id": 3653,
 *         "role": 2
 *       }
 *     ]
 *   },
 *   "error": null,
 *   "messages": [
 *     {
 *       "conversation_id": 5,
 *       "user_id": 1379,
 *       "parts": [
 *         {
 *           "content": "Йо нига",
 *           "mime_type": "text/plain"
 *         }
 *       ],
 *       "created_at": 1461074705,
 *       "id": 24
 *     }
 *   ]
 * }
 *
 * REJECT (one of ERROR_CODES) {UNATHORIZED, NOT_EXISTS}
 */
export function create(conversation_id, text, mime_type) {

  return new Promise( (resolve, reject) => {
    channel.req("create", "message", { conversation_id, text, mime_type })
    .then( data => {
      if (data.error && data.error.code === ERROR_CODES.NOT_EXISTS) {
        // ToDo temp, Igor must add 400 error to log, then delete it
        reject(ERROR_CODES.NOT_EXISTS);
      } else {
        resolve(data.response_map);
      }
    }).catch( error => {
      if (error.log_map.code_key === '403') {
        reject(ERROR_CODES.UNATHORIZED);
      } else if (error.log_map.code_key === '400') {
        reject(ERROR_CODES.NOT_EXISTS);
      }
    });

  });
}

/**
 * Set message status to 'read'
 * @param {Number} conversation_id
 * @param {Number} message_id
 * @return {Promise}
 */
export function update(conversation_id, message_id) {
  return channel
    .req('update', 'message', {conversation_id, message_id})
    .then(data => {
      if (data.error && data.error.code === ERROR_CODES.NOT_EXISTS) {
        throw ERROR_CODES.NOT_EXISTS;
      } else {
        return data.response_map.status === 'ok';
      }
    })
    .catch(err => {
      if (err.log_map.code_key === '403') {
        throw ERROR_CODES.UNATHORIZED;
      } else if (err.log_map.code_key === '400') {
        throw ERROR_CODES.NOT_EXISTS;
      }
    });
}

/**
 * Listen when msg notify received
 * @param  {function} handler    call it func when fired event
 */
export function onMsg(handler) {
  channel.on('RETRIEVED', 'message', handler);
}

export function removeListenerMsg(handler) {
  channel.removeListener('RETRIEVED', 'message', handler);
}

export function onMsgRead(handler) {
  channel.on('READED', 'message', handler);
}

export function removeListenerMsgRead(handler) {
  channel.on('READED', 'message', handler);
}