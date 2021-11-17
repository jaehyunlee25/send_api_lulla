select 
	array_agg(grade) grades
from 
	members m
	left join school_roles sr on m.school_role_id = sr.id
where 
	m.id in ${members}
	and m.is_active = true;