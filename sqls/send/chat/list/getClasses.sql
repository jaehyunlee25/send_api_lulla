select 
    array_agg(
		distinct(
			case
				when m.class_id is null then m.school_id
				else m.class_id
			end
		)
	) class_ids
from 
    chat_room cr
    left join members m on m.id = any(cr.members)
where
	cr.id in (select 
                    id 
                from 
                    chat_room 
                where '${memberId}' = any(members)
            )
	and m.id != '${memberId}';