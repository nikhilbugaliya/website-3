/* globals getCookie, setCookie, removeCookie */

/*
 * WARNING: don't use direct (isn't sync correctly).
 * Use vuex/modules/user instead
 */

var prefix = '_te_';

var Storage = getStorage();
var cachedProfile = getProfile();

/**
 *
 * Get profile
 * Autogenerated and from server (profile.user)
 * @param  {boolean} withoutCache  if then disable caching
 * @return {object}                profile object
 */
export function getProfile(withoutCache) {
  if (cachedProfile && !withoutCache) {
    return cachedProfile;
  }

  var profile = {
    uid: Storage.getItem('uid'),
    user: Storage.getItem('user'),
    token: Storage.getItem('token'),
    first_visit_at: Storage.getItem('first_visit_at'),
    last_visit_at: Storage.getItem('last_visit_at'),
    isSubscribedEmail: Storage.getItem('isSubscribedEmail'),
    subscribe_at: Storage.getItem('subscribe_at'),
  };

  // if first visit
  if (!profile.uid) {
    profile = createProfile();
    profile.isFirstVisit = true;
  } else {
    profile.isFirstVisit = false;
  }

  if (!profile.token) {
    profile.isAuthorized = false;
  } else {
    profile.isAuthorized = true;
  }

  Storage.setItem('last_visit_at', (new Date()).getTime());
  cachedProfile = profile;

  return profile;
}

export function createProfile() {

  var uid = window.guid();
  var first_visit_at = (new Date()).getTime();

  Storage.setItem('uid', uid);
  Storage.setItem('first_visit_at', first_visit_at);

  return getProfile(true);
}

export function getStorage() {
    return new CookieStorage();
}

export function CookieStorage() {
  this.setItem = (name, value) => setCookie(`${prefix}${name}`, value, 1095);
  this.getItem = (name) => getCookie(`${prefix}${name}`);
  this.removeItem = removeCookie;
}

export function setSubscribeEmail(flag) {
  Storage.setItem('isSubscribedEmail', flag);
  Storage.setItem('subscribe_at', (new Date()).getTime());
}

export function saveToken(token) {
  Storage.setItem('token', token);
  return getProfile(true);
}

/**
 * Save user data
 * @param {object} data see below
 * {
 *  "id": 1379,
 *  "name": "Покупатель #1",
 *  "email": "happierall@gmail.com",
 *  "phone": "+79388708611",
 *  "instagram_id": 1482392154,
 *  "instagram_username": "happierall",
 *  "instagram_fullname": "Руслан Янбердин",
 *  "instagram_avatar_url": "https://scontent.cdninstagram.com/t51.2885-19/10932407_823916984341993_1645923981_a.jpg",
 *  "instagram_caption": "Hi all"
 * }
 */
export function saveUser(data) {
  Storage.setItem('user', data);
  return getProfile(true);
}

/**
 * profile
 * @type {string} uid - инднтификатор юзера
 * @type {object} user - user data
 * @type {string} token - токен авторизации
 * @type {timestamp} first_visit_at - время первого посещения
 * @type {timestamp} last_visit_at  - время последненго посещения
 * @type {boolean} isFirstVisit - флаг, индефицирующий первое посещение
 * @type {boolean} isSubscribedEmail - флаг, индефицирующий подписку, true - подписан
 * @type {timestamp} subscribe_at - время согласия/несогласия с подпиской
 * @ return {object}
 */
export default cachedProfile;
