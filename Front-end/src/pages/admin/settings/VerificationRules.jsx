import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Save, RotateCcw } from "lucide-react";
import { FormInput, FormSelect, Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const VerificationRules = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getSettings();
        if (res.success) setSettings(res.data.verification);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateSettings({ verification: settings });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-96"><div className="w-10 h-10 border-4 border-[#204ecf] border-t-transparent rounded-full animate-spin" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Verification Rules</motion.h1>
          <p className="text-slate-500 text-sm mt-1">Configure freelancer verification requirements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.location.reload()}><RotateCcw size={16} /> Reset</Button>
          <Button onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10"><Shield className="text-emerald-400" size={20} /></div>
          <h3 className="text-lg font-bold text-slate-100">Identity Verification</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSelect label="CNIC Verification" value={settings?.cnicRequired ? "required" : "optional"} onChange={(e) => setSettings({ ...settings, cnicRequired: e.target.value === "required" })}
            options={[{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }]}
          />
          <FormSelect label="Phone Verification" value={settings?.phoneRequired ? "required" : "optional"} onChange={(e) => setSettings({ ...settings, phoneRequired: e.target.value === "required" })}
            options={[{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }]}
          />
          <FormSelect label="Email Verification" value={settings?.emailRequired ? "required" : "optional"} onChange={(e) => setSettings({ ...settings, emailRequired: e.target.value === "required" })}
            options={[{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }]}
          />
          <FormSelect label="Profile Photo Requirement" value={settings?.photoRequired ? "required" : "optional"} onChange={(e) => setSettings({ ...settings, photoRequired: e.target.value === "required" })}
            options={[{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }]}
          />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Skill Test Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSelect label="Skill Test Requirement" value={settings?.skillTestRequired ? "required" : "optional"} onChange={(e) => setSettings({ ...settings, skillTestRequired: e.target.value === "required" })}
            options={[{ value: "required", label: "Required for all" }, { value: "optional", label: "Optional" }]}
          />
          <FormInput label="Minimum Passing Score (%)" type="number" value={settings?.minPassingScore || ""} onChange={(e) => setSettings({ ...settings, minPassingScore: parseInt(e.target.value) })} />
          <FormInput label="Test Validity (Days)" type="number" value={settings?.testValidity || ""} onChange={(e) => setSettings({ ...settings, testValidity: parseInt(e.target.value) })} />
          <FormInput label="Max Retake Attempts" type="number" value={settings?.maxRetakes || ""} onChange={(e) => setSettings({ ...settings, maxRetakes: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Verification Badges</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { badge: "Verified", desc: "CNIC + Phone + Email verified", color: "emerald" },
            { badge: "Skill Tested", desc: "Passed skill assessment", color: "blue" },
            { badge: "Top Rated", desc: "4.8+ rating, 10+ projects", color: "yellow" },
          ].map((item) => (
            <div key={item.badge} className={`bg-[#1b2029] p-4 rounded-lg border border-${item.color}-500/20`}>
              <p className={`text-sm font-bold text-${item.color}-400 mb-1`}>{item.badge}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VerificationRules;
