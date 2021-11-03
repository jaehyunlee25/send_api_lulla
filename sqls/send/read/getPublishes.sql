select 
	array_agg(id) pub_ids
from 
	chat_publish
where 
	chat_room_id = (select chat_room_id from chat_publish where id = ${pubId})
    and id <= ${pubId}
	and '${memberId}' = any(unreaders);