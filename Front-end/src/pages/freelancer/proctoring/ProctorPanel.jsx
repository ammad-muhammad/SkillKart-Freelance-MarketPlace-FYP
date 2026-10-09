import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, CameraOff, MonitorX } from 'lucide-react';
import { FACE_MISSING_HINT } from './analyzeFrame';

// Ticks every 250ms while the face is missing, so the "cancels in Xs"
// countdown moves smoothly between detection frames.
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
 * Live proctoring panel shown during the test: whether the camera can see a
 * face right now (and the countdown to cancelling if it can't), plus the
 * tab/window strike budget. `cameraActive` is false on a device with no
 * camera — then only the tab/window budget is shown.
 */
export default function ProctorPanel({ proctor, cameraActive, holdMs, browserStrikes, browserMax }) {
  const { live, engineError, cameraError } = proctor;
  const counting = !!(live?.missing && live.since);
  const now = useNow(counting);

  if (!cameraActive && !(browserMax > 0)) return null;

  const failure = engineError || cameraError;
  let tone = 'ok';
  let icon = <ShieldCheck size={16} />;
  let text = 'Face detected — keep yourself in view of the camera';
  if (failure) {
    tone = 'error';
    icon = <CameraOff size={16} />;
    text = failure;
  } else if (live?.missing) {
    tone = 'warn';
    icon = <AlertTriangle size={16} />;
    // `now` can lag one render behind `live.since` when the countdown starts —
    // never show more than the full hold time.
    const left = counting ? Math.max(0, Math.ceil((holdMs - Math.max(0, now - live.since)) / 1000)) : null;
    text = `${FACE_MISSING_HINT}${left !== null ? ` — test cancels in ${left}s` : ''}`;
  }

  return (
    <div className="st-pp" role="status" aria-live="polite">
      {cameraActive && (
        <div className={`st-pp__status st-pp__status--${tone}`}>
          {icon}
          <span>{text}</span>
        </div>
      )}
      {browserMax > 0 && (
        <div className="st-pp__meters">
          <div className="st-pp__browser">
            <MonitorX size={14} />
            <Meter label="Tab / window" used={browserStrikes} max={browserMax} />
          </div>
        </div>
      )}
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
  } else if (live?.missing) {
    tone = 'warn';
    text = FACE_MISSING_HINT;
  } else {
    tone = 'ok';
    text = 'Face detected — you’re ready';
  }
  return <div className={`st-camera-preview__label st-pv st-pv--${tone}`}>{text}</div>;
}
