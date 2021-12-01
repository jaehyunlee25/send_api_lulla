import {
  RESPOND,
  ERROR,
  getUserIdFromToken,
  POST,
} from '../../../../lib/apiCommon';
import setBaseURL from '../../../../lib/pgConn'; // include String.prototype.fQuery
import CHAT from '../../../../lib/chat';

const QTS = {
  // Query TemplateS
  getChatRoom: 'getChatRoom',
  getChatRoomByMember: 'getChatRoomByMember',
  newChatPublish: 'newChatPublish',
  getPublishById: 'getPublishById',
};
let EXEC_STEP = 0;
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

  setBaseURL('sqls/send/chat/say'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.chat.say.3.2.2',
      message: 'send server logic error',
      error: e.toString(),
      step: EXEC_STEP,
    });
  }
}
async function main(req, res) {
  EXEC_STEP = '3.1'; // #3.1. 사용자 토큰을 이용해 userId를 추출한다.
  // 이 getUserIdFromToken 함수는 user의 활성화 여부까지 판단한다.
  // userId가 정상적으로 리턴되면, 활성화된 사용자이다.
  const qUserId = await getUserIdFromToken(req.headers.authorization);
  if (qUserId.type === 'error') return qUserId.onError(res, '3.1');
  const userId = qUserId.message;

  // const { message, topic } = req.body;
  const { member_id: memberId, chat_room_id: roomId, message } = req.body;

  EXEC_STEP = '3.2'; // #3.2. member 검색
  const qMember = await POST(
    'school',
    '/checkMember',
    { 'Content-Type': 'application/json' },
    { userId, memberId },
  );
  if (qMember.type === 'error')
    return qMember.onError(res, '3.2', 'fatal error while searching member');
  const { schoolId /* , grade, classId , kidId */ } = qMember.message;

  EXEC_STEP = '3.3'; // 존재하는 room인지 검증(원도 함께 검색해서 검증)
  const qRoom = await QTS.getChatRoom.fQuery({ roomId, schoolId });
  if (qRoom.type === 'error')
    return qRoom.onError(res, '3.4', 'searching the room in the school');

  if (qRoom.message.rows.length === 0)
    return ERROR(res, {
      message: 'room이 존재하지 않거나, 해당 원에 속한 room이 아닙니다.',
      id: 'ERR.send.chat.say.3.3.2',
      resultCode: 400,
    });

  EXEC_STEP = '3.4'; // room에 속하는 memberId인지 검증
  const qCheckMem = await QTS.getChatRoomByMember.fQuery({ roomId, memberId });
  if (qCheckMem.type === 'error')
    return qCheckMem.onError(res, '3.4', 'creating chat publish');

  if (qCheckMem.message.rows.length === 0)
    return ERROR(res, {
      message: 'room에 메시지를 보낼 권한이 없습니다.',
      id: 'ERR.send.chat.say.3.4.1',
      resultCode: 400,
    });
  const distinctMembers = qCheckMem.message.rows[0].members;

  // #3.5. chat에 기록
  const type = 1; // 1. 텍스트, 2. 파일, 3. 알림장, 4. 투약의뢰
  const readers = [memberId].sql();
  const unreaders = distinctMembers.minus(memberId).sql();
  const qNewPub = await QTS.newChatPublish.fQuery({
    roomId,
    memberId,
    type,
    message,
    readers,
    unreaders,
  });
  if (qNewPub.type === 'error')
    return qNewPub.onError(res, '3.4', 'creating chat publish');
  const pubId = qNewPub.message.rows[0].id;

  // #3.6. 기록된 chat 정보를 가져온다.
  const qPub = await QTS.getPublishById.fQuery({ pubId });
  if (qPub.type === 'error')
    return qPub.onError(res, '3.4', 'creating chat publish');
  const result = qPub.message.rows;
  const jsonMessage = JSON.stringify({
    useType: 'insert',
    data: result,
  });
  const { topic } = result[0];

  // #3.7. 브로커에 퍼블리쉬 한다.
  const qSend = await CHAT({
    message: jsonMessage,
    topic: [schoolId, topic].join('/'),
  });
  if (qSend.type === 'error')
    return ERROR(res, {
      message: 'chatting 메시지 전송에 실패했습니다.',
      id: 'ERR.send.chat.say.3.2.1',
      eStr: qSend.eStr,
    });

  return RESPOND(res, {
    data: qSend.message,
    message: 'chatting 메시지 전송에 성공했습니다.',
    resultCode: 200,
  });
}
