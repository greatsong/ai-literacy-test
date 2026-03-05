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
    // 이미 로그인된 사용자(관리자)가 있으면 익명 인증을 건너뜀
    const _unsubInit = firebase.auth().onAuthStateChanged(user => {
        _unsubInit(); // 1회만 실행
        if (!user) {
            firebase.auth().signInAnonymously()
                .then(() => console.log("Firebase Auth: Signed in anonymously"))
                .catch(e => console.error("Firebase Auth Error:", e));
        } else {
            console.log("Firebase Auth: Existing user", user.email || "(anonymous)");
        }
    });

    console.log("Firebase Connected: ai-literacy-test");
} else {
    console.error("Firebase SDK not loaded");
}
