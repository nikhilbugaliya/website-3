
export const getConversationId = ({conversation}) => conversation.id;
export const getMembers = ({conversation}) => conversation.members;
export const getMessages = ({conversation}) => conversation.messages;
export const getCurrentMember = ({conversation, user}) => {
	if(conversation.members === undefined || conversation.members === null){
		return null;
	}
	return conversation.members.find(({user_id}) => {
		return user_id === user.id;
	});
};
export const conversationNotifyCount = state => state.notify_count;
