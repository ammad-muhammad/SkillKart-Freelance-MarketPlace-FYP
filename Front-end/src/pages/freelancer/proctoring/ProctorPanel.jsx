import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, CameraOff, MonitorX } from 'lucide-react';
import { ISSUE_TYPES, ISSUE_LABELS, ISSUE_HINTS } from './analyzeFrame';

// Ticks every 250ms while an issue is building toward a strike, so the
// "strike in Xs" countdown moves smoothly between detection frames.
const useNow = (running) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now()); // don't count down from a stale time
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  return now;
};

const Meter = ({ label, used, max }) => {
  const ratio = max > 0 ? Math.min(1, used / max) : 0;
  const tone = used >= max - 1 && max > 0 ? 'danger' : used > 0 ? 'warn' : 'ok';
  return (
    <div className={`st-pp__meter st-pp__meter--${tone}`}>
      <span className="st-pp__meter-label">{label}</span>
      <span className="st-pp__meter-bar" aria-hidden="true"><span style={{ width: `${ratio * 100}%` }} /></span>
      <strong>{used}/{max}</strong>
    </div>
  );
};

/**
 * Live proctoring panel shown during the test: what the camera sees right
 * now, how many of each movement have happened, and the strike budgets
 * (camera + tab/window) that cancel the test.
 */
export default function ProctorPanel({ proctor, holdMs, browserStrikes, browserMax }) {
  const { live, counts, strikes, maxStrikes, engineError, cameraError, enabled } = proctor;
  const issue = live?.issue;
  const counting = !!(issue && live.since);
  const now = useNow(counting);

  if (!enabled) return null;

  const failure = engineError || cameraError;
  let tone = 'ok';
  let icon = <ShieldCheck size={16} />;
  let text = 'All good — keep facing the screen';
  if (failure) {
    tone = 'error';
    icon = <CameraOff size={16} />;
    text = failure;
  } else if (issue) {
    tone = 'warn';
    icon = <AlertTriangle size={16} />;
    const left = counting ? Math.max(0, Math.ceil((holdMs - (now - live.since)) / 1000)) : null;
    text = `${ISSUE_HINTS[issue]}${left !== null ? ` — strike in ${left}s` : ''}`;
  }

  return (
    <div className="st-pp" role="status" aria-live="polite">
      <div className={`st-pp__status st-pp__status--${tone}`}>
        {icon}
        <span>{text}</span>
      </div>
      <div className="st-pp__counts" aria-label="Movements detected so far">
        {ISSUE_TYPES.map((t) => (
          <span key={t} className={`st-pp__chip${counts[t] > 0 ? ' st-pp__chip--hit' : ''}${issue === t ? ' st-pp__chip--live' : ''}`}>
            {ISSUE_LABELS[t]} <strong>{counts[t]}</strong>
          </span>
        ))}
      </div>
      <div className="st-pp__meters">
        <Meter label="Camera strikes" used={strikes} max={maxStrikes} />
        {browserMax > 0 && (
          <div className="st-pp__browser">
            <MonitorX size={14} />
            <Meter label="Tab / window" used={browserStrikes} max={browserMax} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The status chip over the rules-screen camera preview: lets the candidate
 * see the face check working (and fix their position) before starting.
 */
export function PreviewStatus({ proctor }) {
  const { engineStatus, engineError, cameraError, cameraOn, detecting, live } = proctor;
  let tone = 'info';
  let text = 'Starting face check…';
  if (engineError || cameraError) {
    tone = 'error';
    text = engineError || cameraError;
  } else if (engineStatus !== 'ready' || !cameraOn) {
    text = engineStatus === 'loading' ? 'Loading face check…' : 'Starting camera…';
  } else if (!detecting) {
    text = 'Looking for your face…';
  } else if (live?.issue) {
    tone = 'warn';
    text = ISSUE_HINTS[live.issue];
  } else {
    tone = 'ok';
    text = 'Face detected — you’re ready';
  }
  return <div className={`st-camera-preview__label st-pv st-pv--${tone}`}>{text}</div>;
}
