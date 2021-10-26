import {
  RESPOND,
  ERROR,
  getUserIdFromToken,
} from '../../../lib/apiCommon';
import setBaseURL from '../../../lib/pgConn'; // include String.prototype.fQuery
import SMS from '../../../lib/sms';

/* const QTS = {
  // Query TemplateS
  newPost: 'newPost',
}; */

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

  setBaseURL('sqls/send/sms'); // 끝에 슬래시 붙이지 마시오.

  // #3.1.
  try {
    return await main(req, res);
  } catch (e) {
    return ERROR(res, {
      id: 'ERR.send.sms.3.2.2',
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
  // const userId = qUserId.message;

  const { message, phone } = req.body;
  // #3.2
  const qSend = await SMS({
    content: message,
    phone,
  });
  if (qSend.type === 'error') return ERROR(res, {
    message: 'SMS 전송에 실패했습니다.',
    id: 'ERR.send.sms.3.2.1',
    eStr: qSend.eStr,
  });

  return RESPOND(res, {
    // data: qSend.message,
    message: 'SMS 전송에 성공했습니다.',
    resultCode: 200,
  });
}
