import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc, doc, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';

const configData = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(configData);
const db = getFirestore(app, configData.firestoreDatabaseId);

async function run() {
  const q = await getDocs(collection(db, 'users'));
  q.forEach(d => console.log(d.id, JSON.stringify(d.data())));
  process.exit(0);
}
run();
