import {
  RESPOND,
  ERROR,
  getUserIdFromToken,
  POST,
  HASH,
} from '../../../../lib/apiCommon';
import setBaseURL from '../../../../lib/pgConn'; // include String.prototype.fQuery
// import CHAT from '../../../../lib/chat';

const QTS = {
  // Query TemplateS
  getChatRoom: 'getChatRoom',
  newChatRoom: 'newChatRoom',
  getChatRoomById: 'getChatRoomById',
};

// req.body를 만들지 않도록 한다.
// export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // #1. cors 해제
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*', // for same origin policy
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': ['Content-Type', 'Authorization'], // for application/json
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  // #2. preflight 처리
  if (req.method === 'OPTIONS') return RESPOND(res, {});

  setBaseURL('sqls/send/chat/generate'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.chat.generate.3.2.2',
      message: 'send server logic error',
      error: e.toString(),
    });
  }
}
async function main(req, res) {
  // #3.1. 사용자 토큰을 이용해 userId를 추출한다.
  // 이 getUserIdFromToken 함수는 user의 활성화 여부까지 판단한다.
  // userId가 정상적으로 리턴되면, 활성화된 사용자이다.
  const qUserId = await getUserIdFromToken(req.headers.authorization);
  if (qUserId.type === 'error') return qUserId.onError(res, '3.1');
  const userId = qUserId.message;

  // const { message, topic } = req.body;
  const { member_id: memberId, members } = req.body;

  // #3.2. member 검색
  const qMember = await POST(
    'school',
    '/checkMember',
    { 'Content-Type': 'application/json' },
    { userId, memberId },
  );
  if (qMember.type === 'error')
    return qMember.onError(res, '3.2', 'fatal error while searching member');
  const { schoolId /* , grade, classId , kidId */ } = qMember.message;

  // #3.3. 올라 온 members로 HMAC SHA256 생성
  // #3.3.1. memberId 포함
  members.push(memberId);
  // #3.3.2. member 중복 제거
  const distinctMembers = [...new Set(members)];
  // #3.3.3. members 정렬
  distinctMembers.sort();
  // #3.3.4. distinctMembers를 hmac sha256으로 만들기
  const topic = HASH(JSON.stringify(distinctMembers));
  console.log('topic', topic);

  // #3.4. chat_room에 생성된 방인지 검색
  const qRoom = await QTS.getChatRoom.fQuery({ schoolId, topic });
  if (qRoom.type === 'error')
    return qRoom.onError(res, '3.4', 'searching chat room');

  let chatRoomId;
  if (qRoom.message.rows.length === 0) {
    // #3.4.1. 없으면 방 생성
    const qNewRoom = await QTS.newChatRoom.fQuery({
      schoolId,
      topic,
      members: distinctMembers.sql(),
    });
    if (qNewRoom.type === 'error')
      return qNewRoom.onError(res, '3.4', 'creating chat room');
    chatRoomId = qNewRoom.message.rows[0].id;
  } else {
    chatRoomId = qRoom.message.rows[0].id;
  }

  // #3.4. chat_room 검색
  const qChatRoom = await QTS.getChatRoomById.fQuery({ chatRoomId });
  if (qChatRoom.type === 'error')
    return qChatRoom.onError(res, '3.4', 'searching chat room by id');
  const chatRoom = qChatRoom.message.rows[0];

  return RESPOND(res, {
    chat_room_id: chatRoomId,
    chat_room_topic: [schoolId, topic].join('/'),
    chat_room_members: chatRoom.members,
    message: 'chatting 메시지 전송에 성공했습니다.',
    resultCode: 200,
  });
}
