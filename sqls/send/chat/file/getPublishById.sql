select
    cp.id,
    m.id sender_id,
	m.nickname sender_name,
	split_part(f.thumbnail_address,'/',4) sender_thumbnail,
    cp.type publish_type, 
    cpf.key file_key,
    split_part(cpf.thumbnail_address,'/',4) thumbnail,
    cardinality(cp.readers) readers,
    cardinality(cp.unreaders) undreaders,
	case (now()::date - cp.created_at::date)
		when 0 then to_char(cp.created_at,'HH24:MI')
		else to_char((cp.created_at), 'MM-DD')
	end send_time
from
    chat_publish cp
	left join members m on m.id = cp.sender_id
	left join file f on f.id = m.image_id
    left join file cpf on cpf.id = cast(cp.message as uuid)
where
    cp.id = ${pubId}
    and cp.type = 2
order by 
    cp.created_at asc;