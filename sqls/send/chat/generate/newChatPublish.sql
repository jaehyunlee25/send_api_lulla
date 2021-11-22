insert into
    chat_publish(
        chat_room_id,
        sender_id,
        type,
        message,
        readers,
        unreaders,
        created_at,
        updated_at
    )
values(
    '${chatRoomId}',
    '${memberId}',
    ${type},
    '${message}',
    '${readers}',
    '${unreaders}',
    now(),
    now()
) returning id;