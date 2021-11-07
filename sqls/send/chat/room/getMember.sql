select
    *
from
    chat_room
where
    id = '${chatRoomId}'
    and '${memberId}' = any(members);