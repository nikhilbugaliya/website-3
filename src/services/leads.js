import channel from "services/channel/channel.js";

export const ERROR_CODES = {
  NOT_EXISTS: 1,
  FORBIDDEN: 2,

  // Local
  UNATHORIZED: 3,
  OBJECT_NOT_EXIST: 4,
};

export const USER_ROLES = {
  UNKNOWN: {name: "НЛО", key: 0},
  CUSTOMER: {name: "Покупатель", key: 1},
  SUPPLIER: {name: "Поставщик", key: 2},
  SELLER: {name: "Продавец", key: 3},
  SUPER_SELLER: {name: "Супер продавец", key: 4},
};

export const getRole = key => {
  for (let [, value] of Object.entries(USER_ROLES)) {
    if (value.key === key) {
      return value;
    }
  }
};

export const STATUSES = {
  //this status means we created a lead in db,
  // but did not perform any predefined actions
  EMPTY: {name: "Пустой", key: 0},
  NEW: {name: "Новый", key: 1},
  IN_PROGRESS: {name: "В процессе", key: 2},
  SUBMITTED: {name: "Подтвержден", key: 3},
  ON_DELIVERY: {name: "На доставке", key: 4},
  COMPLETED: {name: "Выполнен", key: 5},
  CANCELLED: {name: "Отменен", key: 6},
};

export const getStatus = key => {
  for (let [, value] of Object.entries(STATUSES)) {
    if (value.key === key) {
      return value;
    }
  }
};

export const STATUS_EVENTS = [
  {name: "Новый", key:"CREATE"},
  {name: "В процессе", key:"PROGRESS"},
  {name: "Подтвержден", key:"SUBMIT"},
  {name: "На доставке", key:"DELIVERY"},
  {name: "Выполнен", key:"COMPLETE"},
  {name: "Отменен", key:"CANCEL"},
];


/**
 * List of user leads
 * @login_required
 *
 * RESOLVE
 * [
 *    {
 *      "id": 1,
 *      "source": "website",
 *      "customer_id": 1379,
 *      "status": 3,
 *      "user_role": 1,
 *      "conversation_id": 1,
 *      "products": [
 *        {
 *          "id": 17622,
 *          "title": "Тестовый товар #2 (17622)",
 *          "code": "tf9744",
 *          "instagram_image_caption": "Минимализм в лучшем виде 💗✌️Этот комбинезон вы сможете найти по ссылке в профиле 😊 RG: @syanafromparis",
 *          "instagram_image_id": "1223302707884078653",
 *          "instagram_image_url": "https://scontent.cdninstagram.com/l/t51.2885-15/s480x480/e35/12965842_803674876433752_380340161_n.jpg?ig_cache_key=MTIyMzMwMjcwNzg4NDA3ODY1Mw%3D%3D.2",
 *          "instagram_link": "https://www.instagram.com/p/BD6C1TcNDY9/",
 *          "instagram_published_at": -62135596800,
 *          "supplier_id": 129,
 *          "supplier": {},
 *          "mentioned_id": 1996,
 *          "mentioned": {},
 *          "isSale": true,
 *          "items": [
 *            {
 *              "name": "Ветровка"
 *            },
 *          ]
 *        },
 *      ],
 *      "customer": {
 *        "id": 1379,
 *        "instagram_id": 1482392154,
 *        "instagram_username": "happierall",
 *        "instagram_fullname": "Руслан Янбердин",
 *        "instagram_avatar_url": "https://scontent.cdninstagram.com/t51.2885-19/10932407_823916984341993_1645923981_a.jpg",
 *        "instagram_caption": "Hi all"
 *      },
 *      "shop": {
 *        "id": 129,
 *        "instagram_id": 1552963340,
 *        "instagram_username": "asos_ru",
 *        "instagram_fullname": "(TEST 1) ASOS Russia",
 *        "instagram_avatar_url": "https://scontent.cdninstagram.com/t51.2885-19/s150x150/11262572_227962937541098_815996954_a.jpg",
 *        "instagram_caption": "Добро пожаловать на официальную страницу ASOS Russia, где вы откроете для себя мир моды онлайн. Присоединяйтесь!"
 *      }
 *    }
 *  ]
 *
 * REJECT (one of ERROR_CODES) {UNATHORIZED}
 */
export function find() {

  return new Promise( (resolve, reject) => {

    channel.req("list", "lead").then( data => {
      resolve(data.response_map.leads);
    }).catch( error => {
      if (error.log_map.code_key === '403') {
        reject(ERROR_CODES.UNATHORIZED);
      }
      console.log("Lead list err:", error);
    });

  });
}


/**
 * Create lead
 * @param  {number} product_id
 *
 * RESOLVE {number} created lead id
 * REJECT (one of ERROR_CODES) {OBJECT_NOT_EXIST, UNATHORIZED}
 */
export function create(product_id) {

  return new Promise( (resolve, reject) => {

    channel.req("create", "lead", {id: product_id})
    .then( data => {
      resolve(data.response_map.leadId);
    }).catch( error => {
      if (error.log_map.code_key === '400') {
        reject(ERROR_CODES.OBJECT_NOT_EXIST);
      } else if (error.log_map.code_key === '403') {
        reject(ERROR_CODES.UNATHORIZED);
      }
    });

  });
}


/**
 * Change lead status
 * @param  {number} lead_id
 * @param  {string} event     key of LEAD_STATUS_EVENTS
 *
 * RESOLVE
 * {
 *   id: 10
 *   source: @dev_want
 *   customer_id: 3592
 *   instagram_pk: nYSh0ZDlrCv/+1KcpCsXNeMIGlU=
 *   status: 1
 *   conversation_id: 19
 * }
 *
 * REJECT (one of ERROR_CODES) {OBJECT_NOT_EXIST, UNATHORIZED}
 */
export function setEvent(lead_id, event) {

  return new Promise( (resolve, reject) => {

    channel.req("event", "lead", {lead_id, event})
    .then( data => {
      resolve(data.response_map.lead);
    }).catch( error => {
      if (error.log_map.code_key === '400') {
        // Not exists or forbiden
        reject(ERROR_CODES.OBJECT_NOT_EXIST);
      } else if (error.log_map.code_key === '403') {
        reject(ERROR_CODES.UNATHORIZED);
      }
    });

  });
}
