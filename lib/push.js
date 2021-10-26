/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-unresolved */
import admin from 'firebase-admin';
import secret from '../static/secret.json';

admin.initializeApp({
  credential: admin.credential.cert(secret),
  databaseURL: 'https://lullatest.firebaseio.com',
});

export default async function PUSH(param) {
  try {
    const qPush = await admin.messaging().send(param);
    return {
      type: 'success',
      message: qPush,
    };
  } catch (e) {
    return {
      type: 'error',
      message: 'send push failed',
      eStr: e.toString(),
    };
  }
}
