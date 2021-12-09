/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import CryptoJS from "crypto-js";
import axios from "axios";

export default async function SMS(param) {
  try {
    const qSms = await ncpSend(param);
    return {
      type: 'success',
      message: qSms,
    }
  } catch (e) {
    return {
      type: 'error',
      message: 'send sms failed',
      eStr: e.toString(),
    }
  }
}
function ncpSend(param) {
  return new Promise((resolve, reject) => {
    const method = "POST";
    const { naverAddress, naverUri, naverAccessKey, naverScreteKey } =
      process.env;
    const uri = ["/sms/v2/services/", naverUri, "/messages"].join("");
    const timestamp = Date.now().toString();
    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, naverScreteKey);
    
    hmac.update(method);
    hmac.update(" ");
    hmac.update(uri);
    hmac.update("\n");
    hmac.update(timestamp);
    hmac.update("\n");
    hmac.update(naverAccessKey);
    
    const hash = hmac.finalize();
    
    axios({
      method,
      url: [naverAddress, uri].join(""),
      headers: {
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": naverAccessKey,
        "x-ncp-apigw-signature-v2": hash.toString(CryptoJS.enc.Base64),
      },
      data: {
        type: "LMS",
        contentType: "COMM",
        from: process.env.naverSenderPhone,
        content: param.content,
        messages: [{ to: param.phone }],
      },
    })
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.log(err);
        reject(new Error(err));
      });
  });
}
