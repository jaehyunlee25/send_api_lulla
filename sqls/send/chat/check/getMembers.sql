select 
    array_agg(members) members
from
    chat_room
where
    id = '${chatRoomId}';