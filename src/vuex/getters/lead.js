export const getLeads     = ( state ) => {

	if ( !getIsTab( state ) ) {

		if ( state.leads.seller.length > 0 ) {

			return state.leads.seller;

		}

		return state.leads.customer;

	}

	return state.leads[ state.leads.tab ];

};

export const getIsTab     = ( { leads } ) => {
	
	return (leads.seller.length > 0) && (leads.customer.length > 0);

};

export const isEmptyLeads = ( state ) => {

	return !getIsTab( state );

};

export const getOlderLead = ( { leads:{tab,  seller, customer } } ) => {
	const times = [];

	const leads = { seller, customer }[tab];
	for ( let i = leads.length; i; i-- ) {
		times.push( leads[ i - 1 ].updated_at );
	}
	return Math.min.apply( Math, times );
};
export const getTitle     = ( state ) => {
	if ( getIsTab( state ) ) {
		return;
	}

	if ( state.leads.seller.length > 0 ) {
		return "Чаты с покупателями";
	}

	return "Шопинг-чаты";

};
export const getTab       = state => state.leads.tab;
export const getPending   = state => state.leads.pending;
export const getGlobalNotifyCount   = state => state.leads.global_notify_count;
export const getNotifyCountList   = state => state.leads.notify_count;
export const getLastMessage = ( state ) => {

	const messages = {};
	const leads = getLeads(state);

	for (let i = leads.length; i; i--) {
		const { id, chat } = leads[ i - 1 ];
		
		if ( chat !== null ) {
			
			const mime = chat.recent_message.parts[ 0 ].mime_type;
			const data = chat.recent_message.parts[ 0 ].content;
			
			if ( mime === 'text/plain' ) {
				messages[ id ] = data;
			}
			if ( mime === 'text/json' ) {
				messages[ id ] = `товар: ${JSON.parse( data ).Title}`;
			}
			
		} else {
			messages[ id ] = '';
		}
		
	}

	return messages;

};