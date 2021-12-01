select
    *
from
    chat_room
where
    id = '${roomId}'
    and '${memberId}' = any(members);