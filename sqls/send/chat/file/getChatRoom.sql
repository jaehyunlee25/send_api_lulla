select
    *
from
    chat_room
where
    school_id = '${schoolId}'
    and topic = '${topic}';