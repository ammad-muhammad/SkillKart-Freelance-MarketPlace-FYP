
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FormInput,
  Plus,
  Trash2,
  Save,
  Edit3
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import CMSCard from "../components/shared/CMSCard";
import CMSModal from "../components/shared/CMSModal";
import CMSConfirmDialog from "../components/shared/CMSConfirmDialog";
import FormFieldEditor from "../components/editors/FormFieldEditor";
import { generateId } from "../utils/cmsHelpers";

// ====================================================================
// FORMS MANAGER - Manage form fields and configurations
// ====================================================================

const FormsManager = () => {
  const { formFields, updateFormFields, addFormField, updateFormField, deleteFormField } = useCMS();
  const [selectedForm, setSelectedForm] = useState("contact");
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [newField, setNewField] = useState({
    label: "",
    placeholder: "",
    type: "text",
    required: false
  });

  const forms = Object.entries(formFields);
  const currentForm = formFields[selectedForm];

  // Helper to get all fields (handling both flat and stepped forms)
  const getAllFields = () => {
    if (!currentForm) return [];
    if (currentForm.fields) return currentForm.fields;
    if (currentForm.steps) {
      // Return fields with step info for tracking
      return currentForm.steps.flatMap((step, stepIndex) => {
        const stepFields = [];
        if (step.fields) stepFields.push(...step.fields);
        if (step.clientFields) stepFields.push(...step.clientFields);
        if (step.freelancerFields) stepFields.push(...step.freelancerFields);
        
        return stepFields.map(f => ({ 
            ...f, 
            _stepIndex: stepIndex, 
            _stepType: step.clientFields && step.clientFields.find(cf => cf.id === f.id) ? 'client' : (step.freelancerFields && step.freelancerFields.find(ff => ff.id === f.id) ? 'freelancer' : 'common') 
        }));
      });
    }
    return [];
  };

  const allFields = getAllFields();

  const handleAddField = () => {
    if (!newField.label.trim()) return;
    
    const fieldToAdd = {
      id: generateId(),
      ...newField
    };

    if (currentForm.steps) {
        // Add to first step by default or try to be smart? 
        // For simplicity: Add to first step's common fields if possible, or create 'fields' array in first step.
        const updatedSteps = [...currentForm.steps];
        if (!updatedSteps[0].fields) updatedSteps[0].fields = [];
        updatedSteps[0].fields.push(fieldToAdd);
        updateFormFields(selectedForm, { steps: updatedSteps });
    } else {
        addFormField(selectedForm, fieldToAdd);
    }
    
    setShowAddFieldModal(false);
    setNewField({ label: "", placeholder: "", type: "text", required: false });
  };

  const handleUpdateField = (fieldId, updatedField) => {
     if (currentForm.steps) {
         const updatedSteps = [...currentForm.steps];
         updatedSteps.forEach(step => {
             ['fields', 'clientFields', 'freelancerFields'].forEach(key => {
                 if (step[key]) {
                     step[key] = step[key].map(f => f.id === fieldId ? { ...f, ...updatedField } : f);
                 }
             });
         });
         updateFormFields(selectedForm, { steps: updatedSteps });
     } else {
         updateFormField(selectedForm, fieldId, updatedField);
     }
  };

  const handleDeleteField = () => {
    if (fieldToDelete) {
      if (currentForm.steps) {
          const updatedSteps = [...currentForm.steps];
          updatedSteps.forEach(step => {
             ['fields', 'clientFields', 'freelancerFields'].forEach(key => {
                 if (step[key]) {
                     step[key] = step[key].filter(f => f.id !== fieldToDelete.id);
                 }
             });
          });
          updateFormFields(selectedForm, { steps: updatedSteps });
      } else {
          deleteFormField(selectedForm, fieldToDelete.id);
      }
      setFieldToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateSubmitButton = (value) => {
      // Handle structure difference: some forms have object, others string
      const currentBtn = currentForm.submitButton;
      let newValue = value;
      if (typeof currentBtn === 'object' && currentBtn !== null) {
          newValue = { ...currentBtn, text: value };
      }
      // logic: if it was object, keep it object with updated text. If it was string, update string.
      // But updateFormFields merges. 
      // Safe bet:
      if (typeof currentBtn === 'object') {
           updateFormFields(selectedForm, { submitButton: { ...currentBtn, text: value } });
      } else {
           updateFormFields(selectedForm, { submitButton: value });
      }
  };

  const getSubmitButtonText = () => {
      if (!currentForm?.submitButton) return "Submit";
      return typeof currentForm.submitButton === 'object' ? currentForm.submitButton.text : currentForm.submitButton;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/cms"
            className="p-2 rounded-lg bg-[#212631] border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-slate-100"
            >
              Forms Manager
            </motion.h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage form fields and configurations
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddFieldModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {/* Form Selector */}
      <CMSCard noPadding>
        <div className="flex items-center gap-2 p-4 overflow-x-auto">
          {forms.map(([formId, form]) => (
            <button
              key={formId}
              onClick={() => setSelectedForm(formId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedForm === formId
                  ? "bg-[#204ecf] text-white"
                  : "bg-[#1b2029] text-slate-400 hover:text-slate-200 border border-slate-700/50"
              }`}
            >
              <FormInput size={16} />
              {form.name}
            </button>
          ))}
        </div>
      </CMSCard>

      {/* Form Stats */}
      <div className="grid grid-cols-3 gap-4">
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{allFields.length}</p>
            <p className="text-xs text-slate-500">Total Fields</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">
              {allFields.filter(f => f.required).length}
            </p>
            <p className="text-xs text-slate-500">Required Fields</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">Active</p>
            <p className="text-xs text-slate-500">Form Status</p>
          </div>
        </CMSCard>
      </div>

      {/* Form Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fields List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Form Fields</h2>
          
          {allFields.length === 0 ? (
            <CMSCard>
              <div className="py-12 text-center">
                <FormInput size={40} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No fields yet</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Add your first field to this form
                </p>
                <button
                  onClick={() => setShowAddFieldModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Add Field
                </button>
              </div>
            </CMSCard>
          ) : (
            <AnimatePresence>
              {allFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <FormFieldEditor
                    field={field}
                    onSave={(updatedField) => handleUpdateField(field.id, updatedField)}
                    onDelete={() => {
                      setFieldToDelete(field);
                      setShowDeleteConfirm(true);
                    }}
                    extraInfo={field._stepIndex !== undefined ? `Step ${field._stepIndex + 1}` : null}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Form Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Form Settings</h2>
          
          <CMSCard title="Submit Button">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Button Text</label>
                <input
                  type="text"
                  value={getSubmitButtonText()}
                  onChange={(e) => handleUpdateSubmitButton(e.target.value)}
                  placeholder="Submit"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
              </div>
              
              {/* Preview */}
              <div className="pt-3 border-t border-slate-700/50">
                <label className="text-xs font-medium text-slate-500 mb-2 block">Preview</label>
                <button className="w-full px-4 py-2.5 bg-[#204ecf] text-white text-sm font-medium rounded-lg">
                  {getSubmitButtonText()}
                </button>
              </div>
            </div>
          </CMSCard>

          <CMSCard title="Field Types">
            <div className="space-y-2">
              {Object.entries(
                allFields.reduce((acc, field) => {
                  acc[field.type] = (acc[field.type] || 0) + 1;
                  return acc;
                }, {})
              ).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-2 bg-[#1b2029] rounded-lg"
                >
                  <span className="text-sm text-slate-300 capitalize">{type}</span>
                  <span className="text-xs text-slate-500 bg-slate-700/30 px-2 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CMSCard>
        </div>
      </div>

      {/* Add Field Modal */}
      <CMSModal
        isOpen={showAddFieldModal}
        onClose={() => setShowAddFieldModal(false)}
        title="Add New Field"
        subtitle={`Add a new field to ${currentForm?.name}`}
        footer={
          <>
            <button
              onClick={() => setShowAddFieldModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddField}
              disabled={!newField.label.trim()}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                newField.label.trim()
                  ? "text-white bg-[#204ecf] hover:bg-[#1a3db3]"
                  : "text-slate-500 bg-slate-700/30 cursor-not-allowed"
              }`}
            >
              Add Field
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Label</label>
              <input
                type="text"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="Field Label"
                className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Placeholder</label>
              <input
                type="text"
                value={newField.placeholder}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                placeholder="Placeholder text"
                className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Field Type</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="number">Number</option>
                <option value="textarea">Textarea</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
                <option value="file">File Upload</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Required</label>
              <button
                onClick={() => setNewField({ ...newField, required: !newField.required })}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                  newField.required
                    ? "bg-[#204ecf]/20 border-[#204ecf]/50 text-[#204ecf]"
                    : "bg-[#1b2029] border-slate-700/50 text-slate-400"
                }`}
              >
                <span className="text-sm">{newField.required ? "Yes" : "No"}</span>
                <div className={`w-8 h-4 rounded-full transition-colors ${
                  newField.required ? "bg-[#204ecf]" : "bg-slate-600"
                }`}>
                  <motion.div
                    animate={{ x: newField.required ? 16 : 0 }}
                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </CMSModal>

      {/* Delete Confirmation */}
      <CMSConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setFieldToDelete(null);
        }}
        onConfirm={handleDeleteField}
        title="Delete Field"
        message={`Are you sure you want to delete "${fieldToDelete?.label}" field? This action cannot be undone.`}
      />
    </div>
  );
};

export default FormsManager;
