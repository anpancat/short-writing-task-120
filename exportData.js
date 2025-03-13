import { db, collection, getDocs } from "./src/firebaseConfig.js"; 
import fs from "fs";
import { parse } from "json2csv";  // CSV 변환을 위한 라이브러리

const exportDataToCSV = async () => {
  try {
    const snapshot = await getDocs(collection(db, "writingData"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      text: doc.data().text,
      wordCount: doc.data().wordCount,
      timestamp: doc.data().timestamp
    }));

    // CSV 변환
    const csv = parse(data);
    fs.writeFileSync("writingData.csv", csv);
    console.log("✅ Firestore 데이터를 writingData.csv 파일로 저장 완료!");
  } catch (error) {
    console.error("🔥 데이터 내보내기 실패:", error);
  }
};

exportDataToCSV();
