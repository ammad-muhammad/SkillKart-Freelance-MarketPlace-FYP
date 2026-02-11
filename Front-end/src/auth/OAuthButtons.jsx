import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const OAuthButtons = () => {
  const handleGoogleLogin = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const handleLinkedInLogin = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('Supabase not configured');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const handleGitHubLogin = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('Supabase not configured');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  return (
    <div className="oauth-buttons">
      <button onClick={handleGoogleLogin} className="btn-google" type="button">
        Continue with Google
      </button>
      <button onClick={handleLinkedInLogin} className="btn-linkedin" type="button">
        Continue with LinkedIn
      </button>
      <button onClick={handleGitHubLogin} className="btn-github" type="button">
        Continue with GitHub
      </button>
    </div>
  );
};

export default OAuthButtons;