update chat_publish 
set unreaders = array_remove(unreaders, '${memberId}'),
	readers = array_cat(readers, '{${memberId}}')
where
	id in (${pubIds});