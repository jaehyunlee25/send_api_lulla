import {
  RESPOND,
  ERROR,
  getUserIdFromToken,
  POST,
} from '../../../../lib/apiCommon';
import setBaseURL from '../../../../lib/pgConn'; // include String.prototype.fQuery

const QTS = {
  // Query TemplateS
  getClasses: 'getClasses',
  getDetail: 'getDetail',
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

  setBaseURL('sqls/send/chat/list'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.read.3.2.2',
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
  const { member_id: memberId } = req.body;

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

  EXEC_STEP = '3.3'; // #3.3. member가 속해 있는 chat_room의 class_id 검색
  const qClasses = await QTS.getClasses.fQuery({ memberId });
  if (qClasses.type === 'error')
    return qClasses.onError(res, '3.3', 'searching publishes');
  const classes = qClasses.message.rows[0].class_ids;

  EXEC_STEP = '3.4'; // #3.4. 리스트 상세정보 출력
  const qList = await QTS.getDetail.fQuery({ memberId });
  if (qList.type === 'error')
    return qList.onError(res, '3.3', 'searching publishes');
  const list = qList.message.rows;

  const rooms = {};
  const result = {};
  result[schoolId] = [];
  classes.forEach((classId) => {
    result[classId] = [];
  });
  list.forEach((item) => {
    if (!rooms[item.id]) rooms[item.id] = [];
    rooms[item.id].push(item);
  });

  EXEC_STEP = '3.5'; // 3.5.
  console.log(schoolId);
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    const userRoom = room[0];
    let roomName;
    if (room.length > 1) {
      userRoom.class_id = schoolId;
      roomName = room
        .map((item) => (item.nickname ? item.nickname : '사용자'))
        .join(', ');
    } else {
      const item = room[0];
      if (item.kid_name)
        roomName = item.kid_name.add('(').add(item.nickname).add(')');
      else roomName = item.nickname ? item.nickname : '사용자';
    }
    userRoom.room_name = roomName;
    result[userRoom.class_id].push(userRoom);
  });

  EXEC_STEP = '3.6'; // 3.6. 반명을 한글로 바꿔준다(겹치는 반명이 있을 수 있다).
  const userResult = {};
  Object.keys(result).forEach((classId) => {
    const userClass = result[classId];
    const userItem = userClass[0];
    if (!userResult[userItem.group_name]) userResult[userItem.group_name] = [];
    userClass.forEach((room) => userResult[userItem.group_name].push(room));
  });

  return RESPOND(res, {
    data: userResult,
    message: 'chatting 방 목록 전송에 성공했습니다.',
    resultCode: 200,
  });
}
