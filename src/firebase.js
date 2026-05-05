// src/firebase.js
// Replace the placeholder values with your Firebase project credentials.
// For security, keep real secrets in environment variables (.env).

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebase.config'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }
