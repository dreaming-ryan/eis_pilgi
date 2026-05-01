/**
 * pilgi_stats.js — sanup_safety_quiz.html의 QUESTIONS 배열을 파싱하여
 * 연도·회차·과목 통계를 계산하고 콜백으로 반환합니다.
 *
 * 데이터 단일 소스: sanup_safety_quiz.html
 * 사용처: index.html, pilgi_by_round.html, pilgi_by_subject.html,
 *         pilgi_random_quiz.html, sanup_safety_quiz.html
 *
 * 사용 예:
 *   PilgiStats.load(stats => {
 *     console.log(stats.totalQ);           // 총 문항 수
 *     console.log(stats.totalRounds);       // 총 회차 수
 *     console.log(stats.totalSubjects);     // 총 과목 수
 *     console.log(stats.yearRounds);        // { "17":["1","2","3"], ..., "22":["1","2"] }
 *     console.log(stats.subjectCounts);     // { 1: 340, 2: 340, ... }
 *     console.log(stats.roundCounts);       // { "22-2": 120, "22-1": 120, ... }
 *     console.log(stats.yearRangeText);     // "17~22년"
 *   });
 */
(function () {
  'use strict';

  // 과목 번호 → 이름 매핑 (sanup_safety_quiz.html의 SUBJECT_NAME과 동일)
  const SUBJECT_NAME = {
    1: "안전관리론",
    2: "인간공학 및 시스템안전공학",
    3: "기계위험방지기술",
    4: "전기위험방지기술",
    5: "화학설비위험방지기술",
    6: "건설안전기술"
  };

  function loadStats(callback) {
    fetch('sanup_safety_quiz.html')
      .then(r => r.text())
      .then(html => {
        const arrMatch = html.match(/const QUESTIONS\s*=\s*(\[[\s\S]*?\]);\s*\n/);
        if (!arrMatch) {
          console.error('pilgi_stats.js: QUESTIONS 배열 추출 실패');
          return;
        }

        // SAFETY_SIGN_IMG 변수가 explain/law 필드에 등장할 수 있으므로 더미로 주입
        const fnBody = 'const SAFETY_SIGN_IMG = "";\nreturn ' + arrMatch[1] + ';';
        let questions;
        try {
          questions = (new Function(fnBody))();
        } catch (e) {
          console.error('pilgi_stats.js: QUESTIONS 평가 실패', e);
          return;
        }

        const totalQ = questions.length;

        // 연도(2자리) Set 및 회차(yy-s 형태) 카운트
        const yearSet  = new Set();
        const roundCounts = {};
        const subjectCounts = {};

        questions.forEach(q => {
          if (!q.round) return;
          const [yy, ss] = q.round.split('-');
          yearSet.add(yy);
          roundCounts[q.round] = (roundCounts[q.round] || 0) + 1;
          if (q.subject != null) {
            subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
          }
        });

        const totalRounds = Object.keys(roundCounts).length;
        const totalSubjects = Object.keys(subjectCounts).length;
        const years = [...yearSet].sort((a, b) => parseInt(a) - parseInt(b));

        // 연도별 회차 목록: { "17": ["1","2","3"], ..., "22": ["1","2"] }
        const yearRounds = {};
        years.forEach(y => { yearRounds[y] = []; });
        Object.keys(roundCounts).forEach(roundKey => {
          const [yy, ss] = roundKey.split('-');
          if (yearRounds[yy] && !yearRounds[yy].includes(ss)) {
            yearRounds[yy].push(ss);
          }
        });
        Object.keys(yearRounds).forEach(y => {
          yearRounds[y].sort((a, b) => parseInt(a) - parseInt(b));
        });

        // 연도 범위 텍스트
        const yearRangeText = years.length
          ? `${years[0]}~${years[years.length - 1]}년`
          : '';
        const yearRangeShort = years.length
          ? `${years[0]}~${years[years.length - 1]}`
          : '';

        // 회차별 라벨 ("22-2" → "22년 2회") — 정렬된 배열
        const sortedRounds = Object.keys(roundCounts).sort((a, b) => {
          const [ay, as] = a.split('-').map(Number);
          const [by, bs] = b.split('-').map(Number);
          if (ay !== by) return ay - by;
          return as - bs;
        });

        callback({
          totalQ,
          totalRounds,
          totalSubjects,
          years,
          yearRounds,
          roundCounts,
          subjectCounts,
          subjectNames: SUBJECT_NAME,
          sortedRounds,
          yearRangeText,
          yearRangeShort,
          questions
        });
      })
      .catch(err => console.error('pilgi_stats.js fetch 오류:', err));
  }

  // 숫자 콤마 포맷터 (1000 → 1,000)
  function fmtComma(n) {
    return Number(n).toLocaleString('ko-KR');
  }

  window.PilgiStats = {
    load: loadStats,
    fmtComma: fmtComma,
    SUBJECT_NAME: SUBJECT_NAME
  };
})();
