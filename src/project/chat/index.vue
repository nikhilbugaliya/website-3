<style src='./styles/chat.pcss'></style>
<template lang="jade">
  scroll-component(v-el:scroll-cnt, class="chat-cnt")
    .loader-center(v-if="showLoader"): app-loader
    popup-img(v-if="imgPopUpUrl", :url="imgPopUpUrl", :width="imgWidth", :height="imgHeight", :on-close="closePopUp")
    chat-header(:notify-count='conversationNotifyCount')
    .chat-shadow(v-if="isMobile && getShowMenu || isMobile && getShowStatusMenu", :class="{'directbot-color': isDirectbot }")
    .section.top.bottom(v-el:section)
      .chat.section__content
        .chat_messages(id="chatmessages", v-el:box-messages)
          template(v-for='msg in filterMessages', track-by='$index')
            div(v-el:messages)
              chat-msg-status(
                v-if='msg.parts[0].mime_type === "json/status"',
                :msg='msg')
              chat-msg-product-old(
                v-if='msg.parts[0].mime_type === "text/json"',
                :msg='msg')
              chat-msg-product(
                v-if='msg.parts[0].mime_type === "text/plain" && hasData(msg) ',
                :msg='msg')
              chat-msg(
                v-if='msg.parts[0].mime_type === "text/plain" && !hasData(msg) || msg.parts[0].mime_type === "auto/answer"',
                :msg='msg',
                :directbot="directbot")
              chat-msg-info(
                v-if='msg.parts[0].mime_type === "text/html"',
                :msg='msg')
              chat-msg-img(
                v-if='isImage(msg.parts[0].mime_type)',
                :msg='msg')
              chat-msg-payment(
                v-if='msg.parts[0].mime_type === "json/payment" || msg.parts[0].mime_type === "json/cancel_order"', :msg='msg')
            chat-msg-order(
                v-if='msg.parts[0].mime_type === "json/order"',
                :msg='msg')

    chat-bar
  scroll-top(:to-up="false")
</template>

<script>
  import settings from 'settings';
  import appLoader from 'base/loader/loader';
  import listen from 'event-listener';
  import scrollTop from 'base/scroll-top/scroll-top.vue';
  //actions
  import {
    setConversation,
    loadMessage,
    closeConversation,
    openPopUp,
    setConversationAction,
    setChatScroll
  } from 'vuex/actions/chat.js';
  import { clearNotify } from 'vuex/actions/lead.js';

  //getters
  import {
    getMessages,
    conversationNotifyCount,
    getId,
    getCurrentMember,
    getLengthList,
    getShowMenu,
    getShowStatusMenu,
    imgPopUpUrl,
    imgWidth,
    imgHeight
  } from 'vuex/getters/chat.js';
  import { isDone } from 'vuex/getters/lead.js';
  import { isAuth, getUseDays } from 'vuex/getters/user.js';


  //services
  import * as messages from 'services/message';
  import * as leads from 'services/leads';

  import ScrollComponent from 'base/scroll/scroll.vue'
  //components
  import ChatMsgOrder from './chat-msg-order.vue';
  import ChatMsgPayment from './chat-msg-payment.vue';
  import ChatMsgProduct from './chat-msg-product.vue';
  import ChatMsgProductOld from './chat-msg-product-old.vue';
  import ChatMsgStatus from './chat-msg-status.vue';
  import ChatMsg from './chat-msg.vue';
  import ChatMsgImg from './chat-msg-img.vue';
  import ChatMsgInfo from './chat-msg-info.vue';
  import ChatBar from './chat-bar.vue';
  import ChatHeader from './chat-header.vue';
  import popupImg from 'base/popup-img/index.vue';

  export default {
    props: {
      directbot: {
        default: false,
        type: Boolean
      }
    },

    components: {
      ScrollComponent,
      popupImg,
      ChatHeader,
      ChatBar,
      ChatMsg,
      ChatMsgOrder,
      ChatMsgPayment,
      ChatMsgProduct,
      ChatMsgProductOld,
      ChatMsgStatus,
      ChatMsgImg,
      ChatMsgInfo,
      scrollTop,
      appLoader,
    },

    data(){
      return {
        needLoadMessage: true,
        lead_id: null,
        isMobile: window.browser.mobile,
        showLoader: true,
        timerId: '',
        fullScroll: 0,
        recursiveCount: 0,
        }
    },

    watch: {
      isDone( done ){
        if ( done ) {
          return this.run();
        }
      }
    },
    route: {
      data( { to: { params: { id:lead_id } } } ) {
        this.$set( 'lead_id', +lead_id );
        if ( this.isDone ) {
          if ( this.isAuth ) {
            return this.run().then(()=>{
              this.clearNotify(this.lead_id);
            })
          } else {
            return Promise.resolve()
          }
        }
      },
    },
    created(){
      /*
      /*D I R E C T B O T
      */
      if(this.directbot){
        if ( this.isDone ) {
          if ( this.isAuth ) {
            return this.run().then(()=>{
              this.clearNotify(this.lead_id);
            })
          } else {
            return Promise.resolve()
          }
        }
      }
    },
    ready(){

      this.$on('goToBottom', () => {

        //this.loadScrollLogic();

      });

      this.$on('addPadding', (val)=>{
        this.$els.section.style.paddingBottom = val + 'px';
        this.$els.scrollCnt.scrollTop = this.$els.scrollCnt.scrollHeight;

      })

      if ( this.isAuth ) {
        this.onMessage      = this.onMessage.bind( this );
        this.scrollListener = listen( this.$els.scrollCnt, 'scroll', this.scrollHandler.bind( this ) );
        messages.onMsg( this.onMessage );

      } else {
        this.$router.go( { name: 'signup' } );
      }
    },

    beforeDestroy() {
      if(this.timerId) {
        clearInterval(this.timerId);
      }
      if ( this.isAuth ) {
        this.scrollListener.remove();
        this.closeConversation();
        messages.offMsg( this.onMessage );
      }
    },

    vuex: {
      actions: {
        setConversationAction,
        setConversation,
        loadMessage,
        clearNotify,
        closeConversation,
        openPopUp,
        setChatScroll
      },
      getters: {
        imgPopUpUrl,
        imgWidth,
        imgHeight,
        isAuth,
        getUseDays,
        isDone,
        getMessages,
        conversationNotifyCount,
        getId,
        getCurrentMember,
        getLengthList,
        getShowMenu,
        getShowStatusMenu
      },
    },

    filters: {
      list( value ){
        const end   = value.length;
        const start = end - this.getLengthList - 1; // -1 потому что есть первое сообщение с датой.
        let messages = value.slice( (start <= 0) ? 0 : start, end );

        this.lastIdx = messages.length - 1;

        return messages;

      }
    },
    computed: {

      filterMessages(){

        const end   = this.getMessages.length;
        const start = end - this.getLengthList - 1; // -1 потому что есть первое сообщение с датой.
        let messages = this.getMessages.slice( (start <= 0) ? 0 : start, end );

        return messages;

      },

      messagesLength(){

        return this.$els.messages;

      },

      chatScrolls(){

        return this.$store.state.conversation.chatScrolls;

      }


    },

    methods: {

      closePopUp(){

        this.openPopUp();

      },

      run(){
        if(this.directbot) this.lead_id = +this.$route.params.id;
        return this
          .setConversation( this.lead_id )

          .then(()=>{

            if(settings.activateMonetization && this.getCurrentMember.role === 2){
              let storage = window.localStorage;

              if(!storage.getItem('firstTimeChatVisited')) {
                storage.setItem('firstTimeChatVisited', true)
                this.$router.go({name: 'monetization'});
              }

              if(storage.getItem('supplierStatus') === 'disabled'){
                this.$router.go({name: 'monetization'});
              }
            }

          })

          .then(()=>{

            return messages
              .find(this.getId, null, 70, false)
              .then((data)=>{
                console.log("CHECK STARTS HJERE ")
                return data.find(message=>{
                  return message.user.user_id === this.getCurrentMember.user_id
                })
              });

          }).then(flagMessage=>{
            if(!flagMessage && this.getCurrentMember.role === 1){
              this.setConversationAction('approve');
              this.$root.$emit('chatEvent','approveButtonHasCome');
            }

          }).then(
            () => {
                    this.$nextTick( () => {

                      //setTimeout(()=>{

                        this.loadScrollLogic();

                      //},2000)

                    } );
            },
            ( error ) => {
              this.$router.go( { name: 'home' } );
            }
          ).then(()=>{
            //redirect if no chat room
            if(this.$store.state.conversation.id === null){
              this.$router.go( { name: '404'});
            }

          }).then(()=>{
            //лоадер
            this.$set('showLoader', false);
          })
      },

      loadScrollLogic(){

        let conversation = this.$store.state.conversation;
        let id =  this.$store.state.conversation.id;

        Promise

          .resolve()

          .then(()=>{
            if(conversation.allInit[id] && this.chatScrolls[id]) {

              this.$els.scrollCnt.scrollTop = this.chatScrolls[id].scroll;
              return false;
            }

            return true;

          })
          .then( goBottom =>{

            if(goBottom) {

              this.goToBottom();
            }

          })



      },

      runLoadingMessage(){

        return new Promise((resolve, reject) => {

          const add = ( scrollHeight ) => {

             if ( document.body.offsetHeight >= scrollHeight ) {

                this
                  .loadMessage()
                  .then( ( messages ) => {

                    if ( messages === null ) {

                      resolve();

                    } else {

                      this.$nextTick( () => {

                        add( this.$els.scrollCnt.scrollHeight )

                      } );

                    }

                  });

             } else {

              resolve();

             }

          };

          this.$nextTick( () => {

            add( this.$els.scrollCnt.scrollHeight )

          } );

        });

      },

      onMessage(){
        Promise.resolve().then(()=>{

          this.$nextTick( this.goToBottom );

        })
      },

      isImage( mime ){
        return mime.indexOf( 'image' ) !== -1;
      },

      hasData(msg){
        if (msg.parts[1] && msg.parts[1].mime_type === 'text/data'){
          try {
            //фишка с автоответами для чата спросить
            //лучше добавить if c проверкой на этот чат
            let content = JSON.parse(msg.parts[1].content)
            if(content.type === "auto"){
              return false;
            }
          } catch (e) {
            console.warn('content is not a JSON')
          }
          return true;
        }
        return false;
      },

      scrollHandler(){

        //сохранение скролла в чатах
        this.setChatScroll(this.$els.scrollCnt.scrollTop)

        const SHAfter = this.$els.scrollCnt.scrollHeight;

        if ( this.needLoadMessage ) {

          if ( this.$els.scrollCnt.scrollTop < 1500 ) {

            this.$set( 'needLoadMessage', false );

            this.loadMessage().then( ( messages ) => {

              this.$nextTick( () => {

                  if ( messages !== null ) {

                    const SHDelta                 = this.$els.scrollCnt.scrollHeight - SHAfter;
                    const percentTopOfHeight      = (this.$els.scrollCnt.scrollTop + SHDelta) / this.$els.scrollCnt.scrollHeight;
                    this.$els.scrollCnt.scrollTop = percentTopOfHeight * this.$els.scrollCnt.scrollHeight;
                    this.$set( 'needLoadMessage', true );

                  }

              } );
            } );

          }
        }

      },
      goToBottom(){

        let height = this.$els.scrollCnt.scrollHeight;

        this.$els.scrollCnt.scrollTop = height;

        if(this.fullScroll !==  height) {

          this.$els.scrollCnt.scrollTop = height;

          this.fullScroll = height;

          this.$nextTick(()=>{

            setTimeout(()=>{

              this.goToBottom();

            },100);

          })

        } else {

          this.recursiveCount++;

          if(this.recursiveCount > 5) return;

          this.$nextTick(()=>{

            setTimeout(()=>{

              this.goToBottom();

            },100);

          })

        }

      }
    },
  }
</script>
