import { useState, useEffect } from 'react';

export default function LiveTimer({ startedAt, hourlyRate, prefix = '', suffix = '' }) {
  const [elapsed, setElapsed] = useState('');
  const [earned, setEarned] = useState(null);

  useEffect(() => {
    if (!startedAt) return;

    const updateTimer = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const formatted = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');

      setElapsed(formatted);

      if (hourlyRate) {
        // Calculate fraction of hour
        const fractionalHours = diff / 3600000;
        setEarned((fractionalHours * hourlyRate).toFixed(2));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, hourlyRate]);

  if (!startedAt) return null;

  return (
    <span>
      {prefix}
      <strong style={{ fontFamily: 'monospace' }}>{elapsed}</strong>
      {hourlyRate && earned !== null && (
        <span style={{ marginLeft: '0.4rem', color: '#059669', fontSize: '0.9em' }}>
          (Rs. {earned})
        </span>
      )}
      {suffix}
    </span>
  );
}
