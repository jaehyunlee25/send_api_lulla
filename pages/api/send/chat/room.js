import {
  RESPOND,
  ERROR,
  getUserIdFromToken,
  POST,
} from '../../../../lib/apiCommon';
import setBaseURL from '../../../../lib/pgConn'; // include String.prototype.fQuery

const QTS = {
  // Query TemplateS
  getMessages: 'getMessages',
  getMessagesPast: 'getMessagesPast',
  getMember: 'getMember',
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

  setBaseURL('sqls/send/chat/room'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.chat.room.3.2.2',
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
  const {
    member_id: memberId,
    chat_room_id: chatRoomId,
    publish_id: publishId,
  } = req.body;

  EXEC_STEP = '3.2'; // #3.2. member 검색
  const qMember = await POST(
    'school',
    '/checkMember',
    { 'Content-Type': 'application/json' },
    { userId, memberId },
  );
  if (qMember.type === 'error')
    return qMember.onError(res, '3.2', 'fatal error while searching member');
  // const { schoolId /* , grade, classId , kidId */ } = qMember.message;

  EXEC_STEP = '3.3'; // #3.3. 검색하고자 하는 chat_room에 memberId가 속해 있는지 검색
  const qMem = await QTS.getMember.fQuery({ chatRoomId, memberId });
  if (qMem.type === 'error')
    return qMem.onError(res, '3.3', 'searching member');
  if (qMem.message.rows.length === 0)
    return ERROR(res, {
      id: 'ERR.send.chat.room.3.3.1',
      message: '해당 채팅방의 정보를 얻을 권한이 없습니다.',
    });

  EXEC_STEP = '3.4'; // #3.3. member가 속해 있는 chat_room의 class_id 검색
  let qList;
  if (publishId) {
    qList = await QTS.getMessagesPast.fQuery({ chatRoomId, publishId });
  } else {
    qList = await QTS.getMessages.fQuery({ chatRoomId });
  }
  if (qList.type === 'error')
    return qList.onError(res, '3.4', 'searching publishes');
  const data = qList.message.rows;

  return RESPOND(res, {
    data,
    message: 'chatting 방 목록 전송에 성공했습니다.',
    resultCode: 200,
  });
}
