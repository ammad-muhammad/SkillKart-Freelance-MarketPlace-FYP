import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Save, RotateCcw, Info } from "lucide-react";
import { FormInput, FormSelect, Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const PaymentRules = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getSettings();
        if (res.success) setSettings(res.data.payment);
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
      await adminService.updateSettings({ payment: settings });
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
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Payment Rules</motion.h1>
          <p className="text-slate-500 text-sm mt-1">Configure payment policies and commission rates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.location.reload()}><RotateCcw size={16} /> Reset</Button>
          <Button onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-blue-400 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-medium text-blue-300">SkillKart Payment Model</p>
          <p className="text-xs text-blue-400/80 mt-1">Freelance: 30% upfront + 70% on completion | Products: 100% upfront to seller</p>
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/10"><CreditCard className="text-emerald-400" size={20} /></div>
          <h3 className="text-lg font-bold text-slate-100">Commission & Fees</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="Platform Commission (%)" type="number" value={settings?.platformCommission || ""} onChange={(e) => setSettings({ ...settings, platformCommission: parseFloat(e.target.value) })} />
          <FormInput label="Withdrawal Fee (PKR)" type="number" value={settings?.withdrawalFee || ""} onChange={(e) => setSettings({ ...settings, withdrawalFee: parseInt(e.target.value) })} />
          <FormInput label="Minimum Withdrawal (PKR)" type="number" value={settings?.minWithdrawal || ""} onChange={(e) => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value) })} />
          <FormInput label="Processing Time (Days)" type="number" value={settings?.processingTime || ""} onChange={(e) => setSettings({ ...settings, processingTime: parseInt(e.target.value) })} />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Payment Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSelect label="JazzCash" value={settings?.jazzCash ? "enabled" : "disabled"} onChange={(e) => setSettings({ ...settings, jazzCash: e.target.value === "enabled" })}
            options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]}
          />
          <FormSelect label="Easypaisa" value={settings?.easypaisa ? "enabled" : "disabled"} onChange={(e) => setSettings({ ...settings, easypaisa: e.target.value === "enabled" })}
            options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]}
          />
          <FormSelect label="Bank Transfer" value={settings?.bankTransfer ? "enabled" : "disabled"} onChange={(e) => setSettings({ ...settings, bankTransfer: e.target.value === "enabled" })}
            options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]}
          />
          <FormSelect label="Card Payments" value={settings?.cardPayments ? "enabled" : "disabled"} onChange={(e) => setSettings({ ...settings, cardPayments: e.target.value === "enabled" })}
            options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]}
          />
        </div>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Payment Split Model</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="Upfront Payment (%)" type="number" value={settings?.upfrontPercent || ""} onChange={(e) => setSettings({ ...settings, upfrontPercent: parseInt(e.target.value) })} />
          <FormInput label="Completion Payment (%)" type="number" value={settings?.completionPercent || ""} onChange={(e) => setSettings({ ...settings, completionPercent: parseInt(e.target.value) })} />
        </div>
        <p className="text-xs text-slate-500 mt-4">Note: Upfront + Completion must equal 100%</p>
      </div>
    </div>
  );
};

export default PaymentRules;
