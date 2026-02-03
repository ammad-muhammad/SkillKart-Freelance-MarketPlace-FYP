import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  initialSiteSettings,
  initialPages as initialPagesContent,
  initialComponents as initialComponentsContent,
  initialMedia as initialMediaLibrary,
  initialForms as initialFormFields
} from "../data/initialContent";

// ====================================================================
// CMS CONTEXT
// Provides state management for all CMS content with CRUD operations
// Backend-ready structure for easy API integration
// ====================================================================

const CMSContext = createContext(null);

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error("useCMS must be used within a CMSProvider");
  }
  return context;
};

export const CMSProvider = ({ children }) => {
  // -------------------- STATE --------------------
  const [siteSettings, setSiteSettings] = useState(initialSiteSettings);
  const [pagesContent, setPagesContent] = useState(initialPagesContent);
  const [componentsContent, setComponentsContent] = useState(initialComponentsContent);
  const [mediaLibrary, setMediaLibrary] = useState(initialMediaLibrary);
  const [formFields, setFormFields] = useState(initialFormFields);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  // -------------------- PERSISTENCE --------------------
  useEffect(() => {
    const savedData = localStorage.getItem("SKILLKART_CMS_DATA");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSiteSettings(parsed.siteSettings || initialSiteSettings);
        setPagesContent(parsed.pagesContent || initialPagesContent);
        setComponentsContent(parsed.componentsContent || initialComponentsContent);
        setMediaLibrary(parsed.mediaLibrary || initialMediaLibrary);
        setFormFields(parsed.formFields || initialFormFields);
        setLastSaved(parsed.lastSaved || null);
      } catch (e) {
        console.error("Failed to load CMS data", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return; // Don't save while initial load is happening
    const dataToSave = {
      siteSettings,
      pagesContent,
      componentsContent,
      mediaLibrary,
      formFields,
      lastSaved
    };
    localStorage.setItem("SKILLKART_CMS_DATA", JSON.stringify(dataToSave));
  }, [siteSettings, pagesContent, componentsContent, mediaLibrary, formFields, lastSaved, isLoading]);

  // -------------------- HELPER FUNCTIONS --------------------
  const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const updateLastSaved = () => setLastSaved(new Date().toISOString());

  // -------------------- SITE SETTINGS OPERATIONS --------------------
  const updateSiteSettings = useCallback((updates) => {
    setSiteSettings(prev => ({ ...prev, ...updates }));
    updateLastSaved();
  }, []);

  // -------------------- PAGE OPERATIONS --------------------
  const getPage = useCallback((pageId) => {
    return pagesContent[pageId] || null;
  }, [pagesContent]);

  const updatePage = useCallback((pageId, updates) => {
    setPagesContent(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], ...updates }
    }));
    updateLastSaved();
  }, []);

  // -------------------- SECTION OPERATIONS (CRUD) --------------------
  const createSection = useCallback((pageId, section) => {
    const newSection = {
      ...section,
      id: section.id || generateId(),
      order: section.order || (pagesContent[pageId]?.sections?.length || 0) + 1
    };

    setPagesContent(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        sections: [...(prev[pageId]?.sections || []), newSection]
      }
    }));
    updateLastSaved();
    return newSection;
  }, [pagesContent]);

  const readSection = useCallback((pageId, sectionId) => {
    const page = pagesContent[pageId];
    if (!page) return null;
    return page.sections?.find(s => s.id === sectionId) || null;
  }, [pagesContent]);

  const updateSection = useCallback((pageId, sectionId, updates) => {
    setPagesContent(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        sections: prev[pageId]?.sections?.map(section =>
          section.id === sectionId
            ? { ...section, ...updates, content: { ...section.content, ...updates.content } }
            : section
        ) || []
      }
    }));
    updateLastSaved();
  }, []);

  const deleteSection = useCallback((pageId, sectionId) => {
    setPagesContent(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        sections: prev[pageId]?.sections?.filter(s => s.id !== sectionId) || []
      }
    }));
    updateLastSaved();
  }, []);

  const reorderSections = useCallback((pageId, orderedSectionIds) => {
    setPagesContent(prev => {
      const sections = prev[pageId]?.sections || [];
      const reorderedSections = orderedSectionIds.map((id, index) => {
        const section = sections.find(s => s.id === id);
        return section ? { ...section, order: index + 1 } : null;
      }).filter(Boolean);

      return {
        ...prev,
        [pageId]: {
          ...prev[pageId],
          sections: reorderedSections
        }
      };
    });
    updateLastSaved();
  }, []);

  // -------------------- COMPONENT OPERATIONS --------------------
  const getComponent = useCallback((componentId) => {
    return componentsContent[componentId] || null;
  }, [componentsContent]);

  const updateComponent = useCallback((componentId, updates) => {
    setComponentsContent(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        content: { ...prev[componentId]?.content, ...updates }
      }
    }));
    updateLastSaved();
  }, []);

  // -------------------- MEDIA OPERATIONS --------------------
  const addMedia = useCallback((media) => {
    const newMedia = {
      ...media,
      id: media.id || generateId(),
      usedIn: media.usedIn || []
    };
    setMediaLibrary(prev => [...prev, newMedia]);
    updateLastSaved();
    return newMedia;
  }, []);

  const updateMedia = useCallback((mediaId, updates) => {
    setMediaLibrary(prev =>
      prev.map(m => m.id === mediaId ? { ...m, ...updates } : m)
    );
    updateLastSaved();
  }, []);

  const deleteMedia = useCallback((mediaId) => {
    setMediaLibrary(prev => prev.filter(m => m.id !== mediaId));
    updateLastSaved();
  }, []);

  // -------------------- FORM FIELD OPERATIONS --------------------
  const getFormFields = useCallback((formId) => {
    return formFields[formId] || null;
  }, [formFields]);

  const updateFormFields = useCallback((formId, updates) => {
    setFormFields(prev => ({
      ...prev,
      [formId]: { ...prev[formId], ...updates }
    }));
    updateLastSaved();
  }, []);

  const addFormField = useCallback((formId, field) => {
    const newField = {
      ...field,
      id: field.id || generateId()
    };
    setFormFields(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        fields: [...(prev[formId]?.fields || []), newField]
      }
    }));
    updateLastSaved();
    return newField;
  }, []);

  const updateFormField = useCallback((formId, fieldId, updates) => {
    setFormFields(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        fields: prev[formId]?.fields?.map(f =>
          f.id === fieldId ? { ...f, ...updates } : f
        ) || []
      }
    }));
    updateLastSaved();
  }, []);

  const deleteFormField = useCallback((formId, fieldId) => {
    setFormFields(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        fields: prev[formId]?.fields?.filter(f => f.id !== fieldId) || []
      }
    }));
    updateLastSaved();
  }, []);

  // -------------------- STATS HELPERS --------------------
  const getStats = useCallback(() => {
    const totalPages = Object.keys(pagesContent).length;
    const totalSections = Object.values(pagesContent).reduce(
      (acc, page) => acc + (page.sections?.length || 0), 0
    );
    const totalComponents = Object.keys(componentsContent).length;
    const totalMedia = mediaLibrary.length;
    const totalForms = Object.keys(formFields).length;

    return {
      totalPages,
      totalSections,
      totalComponents,
      totalMedia,
      totalForms,
      lastSaved
    };
  }, [pagesContent, componentsContent, mediaLibrary, formFields, lastSaved]);

  // -------------------- CONTEXT VALUE --------------------
  const value = {
    // State
    siteSettings,
    pagesContent,
    componentsContent,
    mediaLibrary,
    formFields,
    isLoading,
    lastSaved,

    // Site Settings
    updateSiteSettings,

    // Pages
    getPage,
    updatePage,

    // Sections (CRUD)
    createSection,
    readSection,
    updateSection,
    deleteSection,
    reorderSections,

    // Components
    getComponent,
    updateComponent,

    // Media
    addMedia,
    updateMedia,
    deleteMedia,

    // Form Fields
    getFormFields,
    updateFormFields,
    addFormField,
    updateFormField,
    deleteFormField,

    // Stats
    getStats
  };

  return (
    <CMSContext.Provider value={value}>
      {children}
    </CMSContext.Provider>
  );
};

export default CMSContext;
