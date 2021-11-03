select 
    cr.school_id school_id, 
    cr.topic topic
from 
    chat_publish cp
	    left join chat_room cr on cr.id = cp.chat_room_id
where 
    cp.id = ${pubId};