select 
	cr.id,
    case
        when m.class_id is null then m.school_id
        else m.class_id
    end class_id,
	case 
		when m.class_id is null then (select name from schools where id = m.school_id)
        when cardinality(cr.members) > 2 then (select name from schools where id = m.school_id)
		else (select name from class where id = m.class_id)
	end group_name,		
	case m.kid_id
		when null then m.nickname
		else (select name from kid where id = m.kid_id)
	end kid_name,	
	m.nickname,	
	cardinality(cr.members) member_count,
	case (select type from chat_publish where chat_room_id = cr.id order by created_at desc limit 1)
		when 1 then (select message from chat_publish where chat_room_id = cr.id order by created_at desc limit 1)
		when 2 then concat('파일', ': ', (
                                            select 
                                                file.name 
                                            from (select message from chat_publish where chat_room_id = cr.id order by created_at desc limit 1) tmp 
                                                left join file on file.id = cast(tmp.message as uuid)
                                        )
                            )
		when 3 then '알림장'
		when 4 then '투약의뢰서'		
	end last_message,
	
	(select 
		 case (now()::date - created_at::date)
			when 0 then to_char(created_at,'HH24:MI')
			else to_char((created_at), 'MM-DD')
		end 
	 from chat_publish where chat_room_id = cr.id order by created_at desc limit 1) send_time,
	 
	(select count(*) from chat_publish where chat_room_id = cr.id and '${memberId}' = any(unreaders)) unreads
from 
	chat_room cr
	left join members m on m.id = any(cr.members)
where
	cr.id in (select id from chat_room where '${memberId}' = any(members))
	and m.id != '${memberId}'	
order by 
	cr.created_at desc;