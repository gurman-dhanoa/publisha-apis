const admin = require('firebase-admin');
// You will need to download your serviceAccountKey.json from Firebase
const serviceAccount = require('../config/firebaseServiceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken; // Contains email, name, picture, uid
  } catch (error) {
    throw new Error('Invalid Firebase token');
  }
};

module.exports = { verifyFirebaseToken };