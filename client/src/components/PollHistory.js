import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import apiService from '../services/apiService';
import socketService from '../services/socketService';
import './style/PollHistory.css';

const PollHistory = () => {
  const { isConnected } = useSelector(s => s.poll);
  const [questions, setQuestions] = useState([]);   // [{id, question, options}]
  const [resultsMap, setResultsMap] = useState({}); // { [questionId]: results }

  // Load all past questions
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const poll = await apiService.getPoll(); // returns { questions: [...] }
        if (!mounted) return;

        const qs = Array.isArray(poll.questions) ? poll.questions : [];
        setQuestions(qs);

        // ask server for each question's results using the socket API you already have
        const socket = socketService.socket || socketService.get?.();
        if (!socket) return;

        const handler = (res) => {
          if (!res?.questionId) return;
          setResultsMap(prev => ({ ...prev, [res.questionId]: res }));
        };

        socket.on('questionResults', handler);

        // request one by one
        qs.forEach(q => socket.emit('requestResults', { questionId: q.id }));

        return () => {
          socket.off('questionResults', handler);
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load history:', e);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="ph-wrap">
      <h1 className="ph-title">View <span className="bold">Poll History</span></h1>

      {questions.map((q, idx) => {
        const res = resultsMap[q.id];
        const total = res?.totalAnswers || 0;
        const counts = res?.answerCounts || {};
        // map option -> % with stable fallback (0)
        const pct = q.options.reduce((acc, opt) => {
          const c = counts[opt.text] || 0;
          acc[opt.text] = total ? Math.round((c / total) * 100) : 0;
          return acc;
        }, {});
        return (
          <section key={q.id} className="ph-block">
            <h2 className="ph-qnum">Question {idx + 1}</h2>

            <div className="ph-card">
              <div className="ph-header">{q.question}</div>

              <div className="ph-body">
                {q.options.map((opt, i) => (
                  <div key={i} className="ph-row">
                    <div className="ph-fill" style={{ width: `${Math.max(pct[opt.text], 0)}%` }} />
                    <span className="ph-chip">{i + 1}</span>
                    <span className="ph-text">{opt.text}</span>
                    <span className="ph-pct">{pct[opt.text]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Floating chat bubble to match mocks */}
      <button className="ph-chat" aria-label="Open help chat">💬</button>
    </div>
  );
};

export default PollHistory;
