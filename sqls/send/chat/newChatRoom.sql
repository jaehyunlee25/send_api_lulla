insert into
    chat_room(
        id,
        school_id,
        topic,
        members,
        created_at,
        updated_at
    )
values(
    uuid_generate_v1(),
    '${schoolId}',
    '${topic}',
    '${members}',
    now(),
    now()
) returning id;