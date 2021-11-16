select 
    s.id id, 
    s.name, 
    (select array_to_json(
        array(
            select 
                row_to_json(tmp) 
            from (select 
                    m.id, 
                    CASE 
                        WHEN sr.grade < 2 THEN concat(s.name) 
                        WHEN sr.grade < 3 THEN concat(u.name,' ',sr.name)
                        WHEN sr.grade < 5 THEN concat(c.name,' ',u.name, ' ', '선생님') 
                        WHEN sr.grade >= 5 THEN concat(c.name,' ',k.name,'(',m.nickname,')') 
                    END member_nickname, 
                    m.description member_description,
                    f.address member_image, 
                    c.name class_name, 
                    c.id class_id, 
                    sr.grade member_grade
                from 
                    member m 
                    join users u on u.id = m.user_id 
                    left join class c on c.id = m.class_id 
                    join school_role sr on m.school_role_id = sr.id 
                    left join file f on m.image_id = f.id
                    left join kid k on m.kid_id = k.id 
                where 
                    sr.grade < 5 
                    and m.id != '${memberId}' 
                    and m.school_id = '${schoolId}'  
                    -- ${role > 4 ? `and (sr.grade = 1 or m.class_id = '${classId}')` : ''} 
                ) tmp
        )
    ) admin_list), 
    (select array_to_json(
        array(
            select 
                row_to_json(tmp) 
            from  (select 
                        c.name, 
                        c.id, 
                        (select array_to_json(
                            array(
                                select 
                                    row_to_json(tmp) 
                                from (select 
                                        m.id, 
                                        ${nickname}, 
                                        m.description member_description,
                                        f.address member_image, c.name class_name, c.id class_id, sr.grade member_grade
                                    from 
                                        member m 
                                        join users u on u.id = m.user_id 
                                        join school_role sr on m.school_role_id = sr.id  
                                        left join kid k on m.kid_id = k.id
                                        left join file f on f.id = m.image_id
                                    where 
                                        sr.grade = 5 
                                        and m.class_id = c.id 
                                        and m.id != '${memberId}' 
                                        and m.school_id = '${schoolId}'
                                    ) tmp
                            )
                        ) guardian)
                    from 
                        class c 
                    where 
                        c.school_id = s.id  
                        -- ${ role < 5 && role > 2 ? `and c.id = '${classId}'` : '' }
                    ) tmp
        )
    ) class_list) 
from member m 
    join schools s on s.id = m.school_id  
where s.id = '${schoolId}';