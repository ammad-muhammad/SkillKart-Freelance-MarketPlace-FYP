import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gavel, Save, RotateCcw } from "lucide-react";
import { FormInput, FormTextarea, Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const PlatformRules = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getSettings();
        if (res.success) setSettings(res.data.platform);
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
      await adminService.updateSettings({ platform: settings });
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
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Platform Rules</motion.h1>
          <p className="text-slate-500 text-sm mt-1">Configure general platform policies and rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.location.reload()}><RotateCcw size={16} /> Reset</Button>
          <Button onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10"><Gavel className="text-blue-400" size={20} /></div>
          <h3 className="text-lg font-bold text-slate-100">General Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="Platform Name" value={settings?.name || ""} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          <FormInput label="Support Email" type="email" value={settings?.supportEmail || ""} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} />
          <FormInput label="Max Gigs Per Freelancer" type="number" value={settings?.maxGigsPerFreelancer || ""} onChange={(e) => setSettings({ ...settings, maxGigsPerFreelancer: parseInt(e.target.value) })} />
          <FormInput label="Max Active Projects Per Freelancer" type="number" value={settings?.maxActiveProjects || ""} onChange={(e) => setSettings({ ...settings, maxActiveProjects: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Project Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="Minimum Project Budget (PKR)" type="number" value={settings?.minProjectBudget || ""} onChange={(e) => setSettings({ ...settings, minProjectBudget: parseInt(e.target.value) })} />
          <FormInput label="Maximum Project Duration (Days)" type="number" value={settings?.maxProjectDuration || ""} onChange={(e) => setSettings({ ...settings, maxProjectDuration: parseInt(e.target.value) })} />
          <FormInput label="Dispute Window (Days)" type="number" value={settings?.disputeWindow || ""} onChange={(e) => setSettings({ ...settings, disputeWindow: parseInt(e.target.value) })} />
          <FormInput label="Auto-Complete After (Days)" type="number" value={settings?.autoCompleteAfter || ""} onChange={(e) => setSettings({ ...settings, autoCompleteAfter: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Terms & Policies</h3>
        <div className="space-y-4">
          <FormTextarea label="Terms of Service Summary" rows={4} value={settings?.termsOfService || ""} onChange={(e) => setSettings({ ...settings, termsOfService: e.target.value })} />
          <FormTextarea label="Privacy Policy Summary" rows={4} value={settings?.privacyPolicy || ""} onChange={(e) => setSettings({ ...settings, privacyPolicy: e.target.value })} />
        </div>
      </div>
    </div>
  );
};

export default PlatformRules;
