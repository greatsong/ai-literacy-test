// Firebase Configuration
const firebaseConfig = {
    apiKey: window.__FIREBASE_API_KEY__ || "FIREBASE_API_KEY_NOT_SET",
    authDomain: "ai-literacy-test.firebaseapp.com",
    projectId: "ai-literacy-test",
    storageBucket: "ai-literacy-test.firebasestorage.app",
    messagingSenderId: "392685416779",
    appId: "1:392685416779:web:73bb3f0fa769231b1db8ce",
    measurementId: "G-BQM0GF9NTV"
};

// Initialize Firebase
let db; // Declare globally

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    // Anonymous Auth for students to allow writes based on security rules
    firebase.auth().signInAnonymously()
        .then(() => console.log("Firebase Auth: Signed in anonymously"))
        .catch(e => console.error("Firebase Auth Error:", e));

    console.log("Firebase Connected: ai-literacy-test");
} else {
    console.error("Firebase SDK not loaded");
}
