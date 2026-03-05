import './Stepper.css';

const Stepper = ({ steps, current }) => (
  <div className="fl-stepper">
    {steps.map((label, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'pending';
      return (
        <div key={i} className={`fl-step fl-step--${state}`}>
          <div className="fl-step__circle">
            {state === 'done' ? '✔' : i + 1}
          </div>
          <span className="fl-step__label">{label}</span>
          {i < steps.length - 1 && <div className={`fl-step__line${state === 'done' ? ' fl-step__line--done' : ''}`} />}
        </div>
      );
    })}
  </div>
);

export default Stepper;
