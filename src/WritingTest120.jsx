import { useState, useEffect } from "react";
import { db, collection, addDoc } from "./firebaseConfig"; // firebase 인증 모듈 불러오기

const getReturnURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("return") || "https://kupsychology.qualtrics.com/jfe/form/SV_3UHLDLvsQJNq0fQ";
};

export default function WritingTest() {
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const requiredWords = ["friend", "surprised", "dogs"];
  const [displayText, setDisplayText] = useState("");

  const typingText = "...DraftMind is typing..."; //입력중
  const hello = "Hello! I’m 'Draft Mind', an AI designed to help with writing. \n It looks like you’re crafting a story. I’d be happy to assist!"; // 인사말
  const level = "Based on general writing principles and storytelling strategies, I will provide assistance that is generally suitable for writers like you."; // 개인화 수준 명시(낮은 개인화)
  const fullText = "In general, to develop a story into a more engaging narrative, it would be beneficial to describe the introduction in more detail. This will enhance the immersion of the story. \n I'll give you an example sentence below, so apply it to your writing! \n \n ex 1) 'A gentle breeze carried the scent of earth and rain, weaving through the quiet streets as the distant hum of city life echoed in the background. The dim glow of streetlights flickered softly, casting long shadows that stretched across the pavement.' \n ex 2) 'There was a soft, golden light as the sun dipped below the horizon, painting the sky with streaks of amber and violet. A faint rustling sound came from the corner, breaking the stillness of the evening air.'"; // 도움 내용

  const examplePhrase = ["a gentle breeze", "the scent of earth and rain", "weaving through the quiet streets", "as the distant hum of city life", "echoed in the background", "the dim glow of streetlights", "flickered softly", "casting long shadows", "stretched across the pavement", "a soft, golden light", "the sun dipped below the horizon", "painting the sky with streaks of amber and violet", "A faint rustling sound came from the corner", "breaking the stillness of the evening air"];  // 예시 구문문들
  const exampleKeywords = ["gentle", "breeze", "carried", "scent", "earth", "rain", "weaving", "quiet", "streets", "distant", "hum", "city", "life", "echoed", "background", "dim", "glow", "streetlights", "flickered", "softly", "casting", "long", "shadows", "stretched", "pavement", "soft", "golden", "light", "sun", "dipped", "horizon", "painting", "sky", "streaks", "amber", "violet", "faint", "rustling", "sound", "came", "corner", "breaking", "stillness", "evening", "air"]; // 예시 단어들

  const [typingIndex, setTypingIndex] = useState(0);
  const [helloIndex, setHelloIndex] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);

  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isHelloTyping, setIsHelloTyping] = useState(false);
  const [isLevelTyping, setIsLevelTyping] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false);
  const [hasFeedbackStarted, setHasFeedbackStarted] = useState(false); // ✅ 추가: 최초 피드백 시작 여부

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showInputLockMessage, setShowInputLockMessage] = useState(false);

  const [warning, setWarning] = useState("");
  const [missingWords, setMissingWords] = useState([]);

  // ✨ Prolific ID 상태 추가
  const [prolificId, setProlificId] = useState("");

  // 🔥 입력 잠금 메시지 상태 추가
  useEffect(() => {
    if (isInputDisabled) setShowInputLockMessage(true);
    else setShowInputLockMessage(false);
  }, [isInputDisabled]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열
  
    // 🔥 영어 여부 검사 (영어 이외 문자가 포함되면 경고)
    const englishPattern = new RegExp("^[a-zA-Z0-9\\s.,!\"\'\\$%&@#\\^*(){}\\[\\]<>?=:_+\\-;\\\\|/~`\\/]*$");
    const containsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(newText); // 한글 포함 여부 확인
  
    if (!englishPattern.test(newText) || containsKorean) {
      warningMessages.push("Please write in English. Non-English characters are detected.");
      setWarning(warningMessages); 
      return; // ✅ 여기서 종료
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
  
      // 🔥 중복 단어 비율 계산 (전체 단어의 30% 이상이 동일한 단어면 경고)
      const overusedWords = Object.entries(wordCounts)
        .filter(([_, count]) => count / words.length > 0.3)
        .map(([word]) => word);
  
      if (overusedWords.length > 0) {
        words = words.filter((word) => !overusedWords.includes(word));
        warningMessages.push(`Too many repeated words: ${overusedWords.join(", ")}`);
      }
  
    } 
      setWordCount(words.length); // 1단어만 입력되었을 때도 정상적으로 카운트
    
  
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
    if (wordCount >= 80 && !hasTriggeredOnce) {
      setIsInputDisabled(true); // ✅ 입력창 비활성화 추가
      setHasFeedbackStarted(true); // ✅ 피드백 시작 표시

      setDisplayText("");
      setTypingIndex(0);
      setHelloIndex(0);
      setLevelIndex(0);
      setFullTextIndex(0);

      setIsTypingTextComplete(false);
      setIsHelloTyping(false);
      setIsLevelTyping(false);
      setIsFullTextTyping(false);

      setHasTriggeredOnce(true);
    }
  }, [wordCount, hasTriggeredOnce, hasFeedbackStarted]);

  // 입력중.. 문구 타이핑효과
  useEffect(() => {
    if (hasTriggeredOnce && !isTypingTextComplete && typingIndex < typingText.length) {
      const timer = setTimeout(() => {
        setDisplayText(typingText.slice(0, typingIndex + 1));
        setTypingIndex(typingIndex + 1);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (typingIndex === typingText.length && !isTypingTextComplete) {
      setTimeout(() => {
        setIsTypingTextComplete(true);
        setDisplayText(""); // 다음 메시지 시작 전 초기화
        setIsHelloTyping(true);
      }, 1000);
    }
  }, [typingIndex, isTypingTextComplete, hasTriggeredOnce]);

  // 인사말 타이핑효과
  useEffect(() => {
    if (isHelloTyping && helloIndex < hello.length) {
      const timer = setTimeout(() => {
        setDisplayText(hello.slice(0, helloIndex + 1));
        setHelloIndex(helloIndex + 1);
      }, 25);
      return () => clearTimeout(timer);
    }

    if (helloIndex === hello.length) {
      setTimeout(() => {
        setDisplayText(""); // 개인화수준 타이핑 시작 전 초기화
        setIsHelloTyping(false);
        setIsLevelTyping(true);
      }, 2000);
    }
  }, [helloIndex, isHelloTyping]);

  // 개인화 수준 타이핑효과
  useEffect(() => {
    if (isLevelTyping && levelIndex < level.length) {
      const timer = setTimeout(() => {
        setDisplayText(level.slice(0, levelIndex + 1));
        setLevelIndex(levelIndex + 1);
      }, 25);
      return () => clearTimeout(timer);
    }

    if (levelIndex === level.length) {
      setTimeout(() => {
        setDisplayText(""); // 다음 메시지 시작 전 초기화
        setIsLevelTyping(false);
        setIsFullTextTyping(true);
      }, 2000);
    }
  }, [levelIndex, isLevelTyping]);

  // AI 글쓰기 제안문구 타이핑효과
  useEffect(() => {
    if (isFullTextTyping && fullTextIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, fullTextIndex + 1));
        setFullTextIndex(fullTextIndex + 1);
      }, 20);

      return () => clearTimeout(timer);
    }
    if (isFullTextTyping && fullTextIndex >= fullText.length) {
      setTimeout(() => {
        setIsFullTextTyping(false);
        setIsInputDisabled(false); // ✅ 입력창 다시 활성화
      }, 1000);
    }
  }, [fullTextIndex, isFullTextTyping]);


  // 🔥 Firestore에 데이터 저장하는 함수 추가
  const handleSubmit = async () => {
    let errorMessages = []; 

    // 단어 수 체크
    if (wordCount < 100) {
      errorMessages.push("❌ Word count is too low (minimum 100 words).");
    }
    if (wordCount > 150) {
      errorMessages.push("❌ Word count exceeds the limit (maximum 150 words).");
    }

    // 영어 여부 검사
    const englishPattern = new RegExp("^[a-zA-Z0-9\\s.,!\"'\\$%&@#\\^*(){}\\[\\]<>?=:_+\\-;\\\\|/~`\\/]*$");
    if (!englishPattern.test(text)) {
      errorMessages.push("❌ Your text contains non-English characters.");
    }

    // 필수 단어 포함 여부 확인
    if (missingWords.length > 0) {
      errorMessages.push(`❌ The following words must be included: ${missingWords.join(", ")}`);
    }

    // ✨ Qualtrics ID 미입력 시 에러 메시지 추가
    if (!prolificId.trim()) {
      errorMessages.push("❌ Please enter your Prolific ID.");
    }


    // 🔥 오류 메시지가 하나라도 있으면 제출 불가
    if (errorMessages.length > 0) {
      alert(`⚠️ Submission failed for the following reasons:\n\n${errorMessages.join("\n")}`);
      return;
    }

    try {
      // 예시 구문 매칭 개수 및 비율 계산
      const lowerText = text.toLowerCase()
      const matchedPhrase = examplePhrase.filter(phrase => lowerText.includes(phrase.toLowerCase())); // 대소문자 구분없이 매칭
      const examplePhraseCount = matchedPhrase.length; // 예시구문 매칭 개수
      const examplePhraseRatio = +(examplePhraseCount / examplePhrase.length).toFixed(2); // 예시구문 반영비율

      //예시 단어 매칭 개수 및 비율 계산
      const textWords = lowerText.match(/\b\w+\b/g) || []; // 텍스트에서 단어만 추출 (문장부호 제거됨)
      const matchedWords = exampleKeywords.filter(keyword =>
        textWords.includes(keyword.toLowerCase())
      ); // 대소문자 구분없이 매칭

      const exampleWordCount = matchedWords.length; // 예시단어 매칭 개수
      const exampleWordRatio = +(exampleWordCount / exampleKeywords.length).toFixed(2); // 예시단어 반영비율

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
      await addDoc(collection(db, "writingData120"), {
        prolificId: prolificId.trim(), // ✨ prolific ID 저장
        text: text.trim(),
        wordCount: wordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        exampleWordCount: exampleWordCount, // 예시단어 매칭개수
        exampleWordRatio: exampleWordRatio, // 예시단어 매칭비율
        exampleWords: matchedWords.join(", "), // 예시단어 매칭된 단어들
        examplePhraseCount: examplePhraseCount, // 예시구문 매칭개수
        examplePhraseRatio: examplePhraseRatio, // 예시구문 매칭비율
        examplePhrase: matchedPhrase.join(", ") // 예시구문 매칭된 구문들
      });

      alert("✅ Your writing has been submitted!");
      setText("");
      setWordCount(0);
      setWarning("");
      setProlificId(""); // ✨ 제출 성공 시 ID 초기화


      console.log("🔁 Returning to:", getReturnURL());

      // 🎯 퀄트릭스로 다시 이동
      window.location.href = getReturnURL();

    } catch (error) {
      console.error("🔥 An error occurred while saving data:", error.message);
      alert(`🔥 An error occurred while saving data: ${error.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          
      {/* 사용자가 글 작성하는 영역 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "10px" }}> 
        <h1>📝 Short Writing Task</h1>
        <p>Write a prompt (100-150 words) about the following words:</p>
        <p style={{ color: "red", fontWeight: "bold" }}>{requiredWords.join(", ")}</p>
        <p className="mt-2">Word Count: {wordCount}</p>

        <textarea
          style={{ width: "100%", height: "200px", padding: "10px", border: "1px solid #ccc", fontSize: "16px" }}
          value={text}
          onChange={(e) => handleChange(e)}
          placeholder="Start writing here..."
          disabled={isInputDisabled} // ✅ 비활성화 반영
        />

        {showInputLockMessage && (
          <p style={{ color: "gray", fontWeight: "bold", fontSize: "14px", marginTop: "5px" }}>
            ✨ DraftMind is writing. Please wait for seconds...
          </p>
        )}
      </div>

      {/* ✨ Prolific ID 입력 필드 추가 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "10px" }}>
        <label style={{ fontWeight: "bold", marginRight: "10px" }}>Prolific ID:</label>
        <input
          type="text"
          value={prolificId}
          onChange={(e) => setProlificId(e.target.value)}
          placeholder="Enter your ID"
          style={{ padding: "5px", fontSize: "14px", width: "200px" }}
        />
      </div>


      {/* AI DraftMind의 출력이 나타나는 영역 */}
      <div 
        style={{ 
          width: "78.5%",
          marginLeft: "21px", 
          padding: "20px",
          border: "1px solid #ccc",
          backgroundColor: "#f9f9f9",
          textAlign: "left",
          overflow: "visible", // 출력내용이 많아지면 자동으로 출력창 크기 조절
          wordBreak: "break-word", // 긴 단어가 출력창을 넘어가면 줄바꿈
          whiteSpace: "pre-wrap", // \n을 줄바꿈으로 인식
          display: "flex",
          flexDirection: "column", // 제목, 설명, 본문을 세로 정렬
          alignItems: "center",
        }}>

        {/* 제목 */}
        <h2 style={{ marginTop: "3px", textAlign: "center" }}> 
          <em>AI DraftMind</em>🪶 Writing Suggestion
        </h2>
       
        {/* 설명 */}
        <p style={{ marginBottom: "30px", fontSize: "12px", textAlign: "center", color: "gray" }}>
          DraftMind is an AI that assists with writing by reading your text and providing suggestions to help you improve your writing.
        </p>

        {/* 본문 및 이미지 컨테이너 (병렬 배치) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            marginTop: "10px",
          }}
        >

        {/* AI 아이콘 (왼쪽) */}
        <img
          src="/images/DraftMind_image.png"
          alt="AI Icon"
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%", // 원형 이미지
            marginRight: "15px", // 이미지와 본문 사이 간격
            objectFit: "cover",
          }}
        />

        {/* 본문 (오른쪽) */}
        <div style={{ flex:1 }}>
          {hasTriggeredOnce && displayText.trim() !== "" && 
            displayText
              .replaceAll(", ", ",\u00A0") // 쉼표 뒤 공백을 불간섭 공백으로 대체하여 줄바꿈 방지
              .split("\n")
              .map((line, index) => (
                <p key={index} style={{ fontWeight: "bold", fontSize: "15px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {line}
                </p>
              ))}
        </div>
      </div>
      </div>
      {/* 경고 메시지 출력 */}
      {warning.length > 0 && (
          <div style={{ color: "red", fontWeight: "bold", fontSize: "16px", marginTop: "10px" }}>
            {warning.map((msg, index) => (
              <p key={index} style={{ margin: "5px 0" }}>❌ {msg}</p>
            ))}
          </div>
        )}

      <span style={{ marginTop: "10px", fontSize: "16px", color: "gray" }}>
      🔔Please make sure to complete the survey after submitting.
      </span>

      {/* Submit 버튼 - 가장 아래로 배치 */}
      <button 
        onClick={handleSubmit} 
        style={{ 
          marginTop: "10px", padding: "12px 25px", backgroundColor: "#007bff", 
          color: "white", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "bold"
        }}>
        Submit
      </button>

    </div>
  );
}