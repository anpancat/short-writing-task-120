import { useState, useEffect } from "react";
import { db, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth } from "./firebaseConfig"; // firebase 인증 모듈 불러오기
import { signInAnonymously, onAuthStateChanged } from "./firebase/auth";

const fetchUserSubmissions = async (userId) => {
  if (!userId) return;

  try {
    const q = query(collection(db, "writingData"), where("userId", "==", userId)); // 🔥 같은 userId 필터링
    const querySnapshot = await getDocs(q);

    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push(doc.data());
    });

    console.log(`📝 사용자 ${userId}의 제출 데이터:`, submissions);
  } catch (error) {
    console.error("❌ Firestore에서 데이터 불러오기 실패:", error.message);
  }
};

const [userId, setUserId] = useState(null); // 🔥 UID 저장할 상태 추
const [isAuthReady, setIsAuthReady] = useState(false); // 로그인 상태 확인 상태 추가


useEffect(() => {
  signInAnonymously(auth)
    .then(() => {
      console.log("✅ 익명 로그인 성공!");
    })
    .catch((error) => {
      console.error("❌ 익명 로그인 실패:", error);
    });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ 현재 사용자 UID:", user.uid);
      setUserId(user.uid);
      setIsAuthReady(true); //로그인 완료료
    } else {
      console.log("❌ 사용자 정보 없음");
      setIsAuthReady(false);
    }
  });
}, []);


export default function WritingTest() {
  const [userId, setUserId] = useState(null); // 🔥 UID 저장할 상태 추가
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const requiredWords = ["sunglasses", "dogs", "doctors"];
  const [displayText, setDisplayText] = useState("");
  const typingText = "...DraftMind가 입력 중입니다...";
  const fullText = "도입부에서 주요 캐릭터와 배경을 더 구체적으로 수정, 보완하면 원하시는 글이 완성될 것 같아요.";

  const [typingIndex, setTypingIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);
  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false);
  const [warning, setWarning] = useState("");
  const [missingWords, setMissingWords] = useState([]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열
  
    // 🔥 영어 여부 검사 (영어 이외 문자가 포함되면 경고)
    const englishPattern = /^[a-zA-Z0-9.,!"'\s\n]*$/;
    const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(newText); // 한글 포함 여부 확인
  
    if (!englishPattern.test(newText) || containsKorean) {
      warningMessages.push("Please write in English. Non-English characters are detected.");
    }
  
    // 🔥 단어 수 계산 (입력된 텍스트가 비어있으면 0으로 설정)
    let words = newText.trim().length === 0 ? [] : newText.trim().split(/\s+/);
  
    // ✅ 2단어 이상 입력된 경우에만 단어 반복 검사 실행
    if (words.length > 1) {
      // 🔥 같은 단어 반복 확인 및 알파벳 하나만 입력 방지
      const wordCounts = {};
      words.forEach((word) => {
        word = word.toLowerCase().replace(/[.,!?]/g, ""); // 🔥 문장부호 제거 후 단어 카운트
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
  
      // 🔥 중복 단어 비율 계산 (전체 단어의 50% 이상이 동일한 단어면 경고)
      const overusedWords = Object.entries(wordCounts)
        .filter(([_, count]) => count / words.length > 0.5)
        .map(([word]) => word);
  
      let filteredWords = words;
      if (overusedWords.length > 0) {
        filteredWords = words.filter((word) => !overusedWords.includes(word));
        warningMessages.push(`Too many repeated words: ${overusedWords.join(", ")}`);
      }
  
      setWordCount(filteredWords.length); // ✅ 단어 수 정상적으로 업데이트
    } else {
      setWordCount(words.length); // 1단어만 입력되었을 때도 정상적으로 카운트
    }
  
    // 🔥 필수 단어 포함 여부 확인 (대소문자 구분 없이 검사)
    const missing = requiredWords.filter((word) =>
      !words.some((w) => w.toLowerCase().replace(/[.,!?]/g, "") === word.toLowerCase()) // 🔥 문장부호 제거 후 비교
    );
  
    setMissingWords(missing);
  
    if (missing.length > 0) {
      warningMessages.push(`The following words must be included: ${missing.join(", ")}`);
    }
  
    // 🔥 중복 제거 후 경고 메시지 설정
    setWarning([...new Set(warningMessages)]);
  };
  

  useEffect(() => {
    if (wordCount >= 30 && !hasTriggeredOnce) {
      setDisplayText("");
      setTypingIndex(0);
      setFullTextIndex(0);
      setIsTypingTextComplete(false);
      setIsFullTextTyping(false);
      setHasTriggeredOnce(true);
    }
  }, [wordCount, hasTriggeredOnce]);

  // 입력중.. 문구 타이핑효과
  useEffect(() => {
    if (hasTriggeredOnce && !isTypingTextComplete && typingIndex < typingText.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + typingText[typingIndex]);
        setTypingIndex(typingIndex + 1);
      }, 150);

      return () => clearTimeout(timer);
    }

    if (typingIndex === typingText.length && !isTypingTextComplete) {
      setTimeout(() => {
        setIsTypingTextComplete(true);
        setDisplayText("");
        setIsFullTextTyping(true);
      }, 5000);
    }
  }, [typingIndex, isTypingTextComplete, hasTriggeredOnce]);

  // AI 글쓰기 제안문구 타이핑효과
  useEffect(() => {
    if (isFullTextTyping && fullTextIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + fullText[fullTextIndex]);
        setFullTextIndex(fullTextIndex + 1);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [fullTextIndex, isFullTextTyping]);


  // 🔥 Firestore에 UID와 함께 데이터 저장하는 함수 추가
  const handleSubmit = async () => {
    console.log("✅ 현재 userId:" , userId); //디버깅용 로그 추가

    if (!userId) {
      alert("⚠️ User ID not found. Please try again.");
      return;
    }

    let errorMessages = []; 

    // 단어 수 체크
    if (wordCount < 150) {
      errorMessages.push("❌ Word count is too low (minimum 150 words).");
    }
    if (wordCount > 200) {
      errorMessages.push("❌ Word count exceeds the limit (maximum 200 words).");
    }

    // 영어 여부 검사
    const englishPattern = /^[a-zA-Z0-9.,!"'\s\n]*$/;
    if (!englishPattern.test(text)) {
      errorMessages.push("❌ Your text contains non-English characters.");
    }

    // 필수 단어 포함 여부 확인
    if (missingWords.length > 0) {
      errorMessages.push(`❌ The following words must be included: ${missingWords.join(", ")}`);
    }

    // 🔥 오류 메시지가 하나라도 있으면 제출 불가
    if (errorMessages.length > 0) {
      alert(`⚠️ Submission failed for the following reasons:\n\n${errorMessages.join("\n")}`);
      return;
    }

    try {
      // 현재 한국 시간(KST) 가져오기
      const koreaTime = new Date();
      // 한국 시간의 날짜와 시간을 문자열로 변환
      const formatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit"
      });

      const formattedKoreaTime = formatter.format(koreaTime);

      //firebase에 UID 포함하여 데이터에 저장
      await addDoc(collection(db, "writingData"), {
        text: text,
        wordCount: wordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        userId: userId, // ✅ UID 저장
      });

      alert("✅ Your writing has been submitted!");
      setText("");
      setWordCount(0);
      setWarning("");
    } catch (error) {
      console.error("🔥 An error occurred while saving data:", error.message);
      alert(`🔥 An error occurred while saving data: ${error.message}`);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "20px" }}>
      <div style={{ width: "48%" }}>
        <h1>📝 Short Writing Task</h1>
        <p>Write a prompt (150-200 words) about the following nouns:</p>
        <p style={{ color: "red", fontWeight: "bold" }}>eg. {requiredWords.join(", ")}</p>
        <p className="mt-2">Word Count: {wordCount}</p>

        <textarea
          style={{ width: "120%", height: "260px", padding: "10px", border: "1px solid #ccc", fontSize: "16px" }}
          value={text}
          onChange={handleChange}
          placeholder="Start writing here..."
        />

        {warning.length > 0 && (
          <div style={{ color: "red", fontWeight: "bold", fontSize: "16px", marginTop: "10px" }}>
            {warning.map((msg, index) => (
              <p key={index} style={{ margin: "5px 0" }}>❌ {msg}</p>
            ))}
          </div>
        )}


        <button  // submit 버튼
          onClick={handleSubmit} 
          disabled={!isAuthReady} // 로그인 완료 전까지 버튼 비활성화화
          style={{ marginTop: "15px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer", fontSize: "16px" }}
        >
          Submit
        </button>
      </div>
      <div style={{ width: "39%", height: "260px", border: "1px solid #ccc", padding: "10px", backgroundColor: "#f9f9f9", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", marginTop: "198px" }}>
        <h2 style={{ marginBottom: "10px", textAlign: "center" }}> <em>AI DraftMind</em>🪶 Writing Suggestion</h2>
        <p style={{ fontSize: "12px", textAlign: "center", color: "gray" }}>DraftMind is an AI that assists with writing by reading your text and providing suggestions to help you improve your writing.</p>
        {hasTriggeredOnce && (
          <p style={{ fontWeight: "bold", textAlign: "center" }}>{displayText}</p>
        )}
      </div>
    </div>
  );
}
