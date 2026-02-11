import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { toast } from 'react-toastify';

const RegisterForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'freelancer',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.requestOTP(formData.email);
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.register(formData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={requestOTP} className="auth-form">
        <h2>Register - Step 1</h2>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={completeRegistration} className="auth-form">
      <h2>Register - Step 2</h2>
      
      <div className="form-group">
        <label>OTP Code</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleChange}
          required
          maxLength="6"
          placeholder="Enter 6-digit OTP"
        />
      </div>

      <div className="form-group">
        <label>First Name</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Last Name</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength="8"
          placeholder="Min 8 characters"
        />
      </div>

      <div className="form-group">
        <label>I am a:</label>
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="freelancer">Freelancer</option>
          <option value="client">Client</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Complete Registration'}
      </button>
    </form>
  );
};

export default RegisterForm;