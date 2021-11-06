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
  getPublishes: 'getPublishes',
  setPublishes: 'setPublishes',
  getPublishResult: 'getPublishResult',
  getTopic: 'getTopic',
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

  setBaseURL('sqls/send/read'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.read.3.2.2',
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
  const { member_id: memberId, publish_id: pubId } = req.body;

  // #3.2. member 검색
  const qMember = await POST(
    'school',
    '/checkMember',
    { 'Content-Type': 'application/json' },
    { userId, memberId },
  );
  if (qMember.type === 'error')
    return qMember.onError(res, '3.2', 'fatal error while searching member');
  // const { /* schoolId , grade, classId , kidId */ } = qMember.message;

  // #3.2.1. 해당 publish의 topic 정보를 가져온다.
  const qTopic = await QTS.getTopic.fQuery({ pubId });
  if (qTopic.type === 'error')
    return qTopic.onError(res, '3.3', 'searching publishes');
  const { school_id: schoolId, topic } = qTopic.message.rows[0];

  // #3.3. 해당 id 이전의 publish 중에 읽지 않은 것들의 id를 모은다.
  const qPubs = await QTS.getPublishes.fQuery({ pubId, memberId });
  if (qPubs.type === 'error')
    return qPubs.onError(res, '3.3', 'searching publishes');
  const pubIds = qPubs.message.rows[0].pub_ids;

  // #3.4. 해당 pubishes의 unreaders / readers 정보를 수정한다(= 읽음 처리한다).
  const qSets = await QTS.setPublishes.fQuery({ pubIds, memberId });
  if (qSets.type === 'error')
    return qSets.onError(res, '3.4', 'updating publishes');

  // #3.6. 기록된 chat 정보를 가져온다.
  const qResult = await QTS.getPublishResult.fQuery({ pubIds });
  if (qResult.type === 'error')
    return qResult.onError(res, '3.4', 'creating chat publish');
  const result = qResult.message.rows;
  const jsonMessage = JSON.stringify({
    useType: 'update',
    data: result,
  });

  // #3.7. 브로커에 퍼블리쉬 한다.
  const qSend = await CHAT({
    message: jsonMessage,
    topic: [schoolId, topic].join('/'),
  });
  if (qSend.type === 'error')
    return ERROR(res, {
      message: 'chatting 메시지 전송에 실패했습니다.',
      id: 'ERR.send.read.3.2.1',
      eStr: qSend.eStr,
    });

  return RESPOND(res, {
    data: qSend.message,
    message: 'chatting 메시지 전송에 성공했습니다.',
    resultCode: 200,
  });
}
