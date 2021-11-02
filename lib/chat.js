/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import mqtt from 'mqtt';

export default async function CHAT(param) {
  try {
    const qChat = await publish(param);
    return {
      type: 'success',
      message: qChat,
    };
  } catch (e) {
    return {
      type: 'error',
      message: 'publish message failed',
      eStr: e.toString(),
    };
  }
}
async function publish(param) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect('mqtt://dev.lulla.co.kr');
    client.on('connect', () => {
      console.log('connected');
      client.publish(param.topic, param.message, { retain: true, qos: 1 });
      resolve(param);
    });
    client.on('error', (err) => {
      console.log('error', err);
      client.end();
      reject(new Error(err));
    });
    /* client.on('message', (topic, message, packet) => {
      console.log(topic, message);
      console.log(packet);
    }); */
  });
}
