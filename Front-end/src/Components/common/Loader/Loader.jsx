import { Loader2 } from 'lucide-react';
import './Loader.css';

const Loader = ({ text = "Loading...", fullScreen = false }) => {
  return (
    <div className={`sk-loader-container ${fullScreen ? 'sk-loader--fullscreen' : ''}`}>
      <div className="sk-loader-content">
        <Loader2 className="sk-loader-icon spin" size={40} />
        <p className="sk-loader-text">{text}</p>
      </div>
    </div>
  );
};

export default Loader;
