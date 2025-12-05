// CSV 파일 업로드 및 Papa.parse 래퍼 함수
// - file: File 객체
// - onComplete(rows): 파싱 완료 후 rows 배열을 인자로 호출
// - onError(err): 오류 시 선택적으로 호출
export function parseCsvFile(file, onComplete, onError) {
  if (!file) return;
  if (typeof window === "undefined" || !window.Papa) {
    alert("CSV 파서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    return;
  }
  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      var rows = (results && results.data) || [];
      if (!rows.length) {
        alert("CSV에서 유효한 데이터 행을 찾지 못했어요.");
        return;
      }
      if (typeof onComplete === "function") {
        try {
          onComplete(rows);
        } catch (e) {
          console.error("CSV onComplete handler error:", e);
        }
      }
    },
    error: function (err) {
      console.error("CSV parse error:", err);
      if (typeof onError === "function") {
        try {
          onError(err);
          return;
        } catch (e) {
          console.error("CSV onError handler error:", e);
        }
      }
      alert("CSV를 읽는 중 오류가 발생했어요.");
    }
  });
}

console.debug("[MUDDHA] parser.js loaded (with parseCsvFile).");
